import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const DeleteDialog = ({ task, onClose, onConfirm, title = "Delete task", text }) => (
  <AlertDialog open={!!task} onOpenChange={(o) => !o && onClose()}>
    <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100" data-testid="delete-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-slate-400">{text || `Delete '${task?.title}'? This cannot be undone.`}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" data-testid="delete-cancel-button">Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700 text-white" data-testid="delete-confirm-button">Confirm</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
