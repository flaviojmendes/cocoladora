import { FaWindowClose } from "react-icons/fa";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }

export function Modal({isOpen, onClose, children}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-100">
      <div
        className="absolute inset-0 bg-secondary opacity-50"
        onClick={onClose}
      ></div>
      <div className="bg-background p-4 rounded shadow-lg z-200 border-4 border-secondary w-full lg:w-1/2 relative">
        <button className="absolute top-2 right-2 text-secondary" onClick={onClose}>
          <FaWindowClose size={24} />
        </button>
        {children}
      </div>
    </div>
  );
}
