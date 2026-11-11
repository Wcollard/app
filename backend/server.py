from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import logging
import os
import re
from contextlib import suppress
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Literal, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field
from pymongo import ASCENDING, IndexModel
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
JWT_ALGORITHM = "HS256"
COLORS = ("green", "blue", "yellow", "red")
FRONTEND_URL = os.environ["FRONTEND_URL"]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("email", ASCENDING)], name="email_unique", unique=True)],
    "login_attempts": [IndexModel([("identifier", ASCENDING)], name="identifier")],
    "todos": [IndexModel([("deadline", ASCENDING)], name="deadline")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


# ---------- models ----------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(exclude={"id"})
        if self.id:
            data["_id"] = ObjectId(self.id)
        return data


class User(BaseDocument):
    email: str
    name: str
    role: Literal["admin", "member"] = "member"
    created_at: str = ""


class Task(BaseDocument):
    title: str
    assignee: str = ""
    matter_no: str = ""
    deadline: str = ""
    color: str = "green"
    hyperlink: str = ""
    notes: str = ""
    updated_at: str = ""
    updated_by: str = ""


class TaskInput(BaseModel):
    title: str
    assignee: str = ""
    matter_no: str = ""
    deadline: str = ""
    color: str = "green"
    hyperlink: str = ""
    notes: str = ""


class ColorInput(BaseModel):
    color: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    password: str = Field(min_length=8)
    role: Literal["admin", "member"] = "member"


class PasswordInput(BaseModel):
    password: str = Field(min_length=8)


class RestoreInput(BaseModel):
    tasks: list[dict]


# ---------- helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def one_line(text: str) -> str:
    return " ".join((text or "").split())


_ALLOWED_PREFIXES = ("http://", "https://", "mailto:", "file://")
_DOMAIN_RE = re.compile(r"^(www\.)?[\w.-]+\.[A-Za-z]{2,}([/:?#].*)?$")
_HOST_RE = re.compile(r"^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(/.*)?$", re.IGNORECASE)


def normalize_url(url: str) -> Optional[str]:
    url = (url or "").strip()
    if not url:
        return ""
    if len(url) > 2048 or any(ch in url for ch in "\r\n\t"):
        return None
    lower = url.lower()
    if lower.startswith(_ALLOWED_PREFIXES):
        return url
    if "://" in url or lower.startswith(("javascript:", "data:")):
        return None
    if _HOST_RE.match(url):
        return "http://" + url
    if _DOMAIN_RE.match(url):
        return "https://" + url
    return None


def parse_deadline(text: str) -> Optional[str]:
    text = (text or "").strip()
    if not text:
        return ""
    try:
        return datetime.strptime(text, "%Y-%m-%d").date().isoformat()
    except ValueError:
        return None


def clean_task(data: TaskInput | dict) -> dict:
    d = data.model_dump() if isinstance(data, BaseModel) else data
    title = one_line(str(d.get("title", "")))
    if not title:
        raise HTTPException(400, "Please enter a task title.")
    deadline = parse_deadline(str(d.get("deadline", "")))
    if deadline is None:
        raise HTTPException(400, "Deadline must be blank or in YYYY-MM-DD format.")
    url = normalize_url(str(d.get("hyperlink", "")))
    if url is None:
        raise HTTPException(400, "Hyperlink must be a valid http, https, mailto, or local file URL.")
    color = d.get("color") if d.get("color") in COLORS else "green"
    return {
        "title": title,
        "assignee": one_line(str(d.get("assignee", ""))),
        "matter_no": one_line(str(d.get("matter_no", ""))),
        "deadline": deadline,
        "color": color,
        "hyperlink": url,
        "notes": str(d.get("notes", "")).strip(),
    }


def oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(404, "Not found")
    return ObjectId(value)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def make_token(user_id: str, kind: str, delta: timedelta) -> str:
    payload = {"sub": user_id, "type": kind, "exp": datetime.now(timezone.utc) + delta}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user_id: str) -> None:
    response.set_cookie("access_token", make_token(user_id, "access", timedelta(minutes=15)),
                        httponly=True, secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie("refresh_token", make_token(user_id, "refresh", timedelta(days=7)),
                        httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def decode(token: str, kind: str) -> str:
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("type") != kind:
        raise HTTPException(401, "Invalid token type")
    return payload["sub"]


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    doc = await db.users.find_one({"_id": oid(decode(token, "access"))}, {"password_hash": 0})
    if not doc:
        raise HTTPException(401, "User not found")
    return User.from_mongo(doc)


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admins only")
    return user


# ---------- app ----------
app = FastAPI()
api = APIRouter(prefix="/api")


@app.middleware("http")
async def origin_guard(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and origin and origin.rstrip("/") != FRONTEND_URL.rstrip("/"):
        return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
    return await call_next(request)


@api.post("/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    email = body.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_at = datetime.fromisoformat(attempt["last"])
        if datetime.now(timezone.utc) - locked_at < timedelta(minutes=15):
            raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": identifier})
    doc = await db.users.find_one({"email": email})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        await db.login_attempts.update_one({"identifier": identifier},
                                           {"$inc": {"count": 1}, "$set": {"last": now_iso()}}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookies(response, str(doc["_id"]))
    return User.from_mongo(doc).model_dump()


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    response.delete_cookie("refresh_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    user_id = decode(token, "refresh")
    if not await db.users.find_one({"_id": oid(user_id)}, {"_id": 1}):
        raise HTTPException(401, "User not found")
    set_auth_cookies(response, user_id)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user.model_dump()


# ----- users (admin) -----
@api.get("/users")
async def list_users(_: User = Depends(require_admin)):
    docs = await db.users.find({}, {"password_hash": 0}).sort("name", 1).to_list(500)
    return [User.from_mongo(d).model_dump() for d in docs]


@api.post("/users")
async def create_user(body: UserCreate, _: User = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "A user with that email already exists.")
    user = User(email=email, name=one_line(body.name), role=body.role, created_at=now_iso())
    doc = user.to_mongo()
    doc["password_hash"] = hash_password(body.password)
    result = await db.users.insert_one(doc)
    user.id = str(result.inserted_id)
    return user.model_dump()


@api.put("/users/{user_id}/password")
async def reset_password(user_id: str, body: PasswordInput, _: User = Depends(require_admin)):
    result = await db.users.update_one({"_id": oid(user_id)}, {"$set": {"password_hash": hash_password(body.password)}})
    if not result.matched_count:
        raise HTTPException(404, "User not found")
    return {"ok": True}


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(400, "You cannot delete your own account.")
    result = await db.users.delete_one({"_id": oid(user_id)})
    if not result.deleted_count:
        raise HTTPException(404, "User not found")
    return {"ok": True}


# ----- tasks -----
@api.get("/tasks")
async def list_tasks(_: User = Depends(get_current_user)):
    docs = await db.todos.find({}).sort([("deadline", 1), ("title", 1)]).to_list(5000)
    return [Task.from_mongo(d).model_dump() for d in docs]


@api.post("/tasks")
async def create_task(body: TaskInput, user: User = Depends(get_current_user)):
    task = Task(**clean_task(body), updated_at=now_iso(), updated_by=user.name)
    result = await db.todos.insert_one(task.to_mongo())
    task.id = str(result.inserted_id)
    return task.model_dump()


@api.put("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskInput, user: User = Depends(get_current_user)):
    fields = {**clean_task(body), "updated_at": now_iso(), "updated_by": user.name}
    doc = await db.todos.find_one_and_update({"_id": oid(task_id)}, {"$set": fields}, return_document=True)
    if not doc:
        raise HTTPException(404, "Task not found")
    return Task.from_mongo(doc).model_dump()


@api.patch("/tasks/{task_id}/color")
async def set_color(task_id: str, body: ColorInput, user: User = Depends(get_current_user)):
    if body.color not in COLORS:
        raise HTTPException(400, "Unknown color")
    doc = await db.todos.find_one_and_update(
        {"_id": oid(task_id)},
        {"$set": {"color": body.color, "updated_at": now_iso(), "updated_by": user.name}},
        return_document=True,
    )
    if not doc:
        raise HTTPException(404, "Task not found")
    return Task.from_mongo(doc).model_dump()


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, _: User = Depends(get_current_user)):
    result = await db.todos.delete_one({"_id": oid(task_id)})
    if not result.deleted_count:
        raise HTTPException(404, "Task not found")
    return {"ok": True}


# ----- backup -----
@api.get("/backup")
async def backup(_: User = Depends(get_current_user)):
    docs = await db.todos.find({}).to_list(10000)
    tasks = [Task.from_mongo(d).model_dump(exclude={"id"}) for d in docs]
    return {"app": "shared-deadline-list", "version": 1, "exported_at": now_iso(), "tasks": tasks}


@api.post("/restore")
async def restore(body: RestoreInput, admin: User = Depends(require_admin)):
    cleaned = []
    for i, raw in enumerate(body.tasks, start=1):
        try:
            item = clean_task(raw)
        except HTTPException as exc:
            raise HTTPException(400, f"Row {i}: {exc.detail}")
        item["updated_at"] = str(raw.get("updated_at") or now_iso())
        item["updated_by"] = str(raw.get("updated_by") or admin.name)
        cleaned.append(Task(**item).to_mongo())
    await db.todos.delete_many({})
    if cleaned:
        await db.todos.insert_many(cleaned)
    return {"restored": len(cleaned)}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin() -> None:
    email = os.environ["ADMIN_EMAIL"].lower()
    if await db.users.find_one({"email": email}) is None:
        await db.users.insert_one({
            "email": email, "name": os.environ.get("ADMIN_NAME", "Admin"), "role": "admin",
            "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]), "created_at": now_iso(),
        })


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed_admin()


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
