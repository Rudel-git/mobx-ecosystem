import { makeAutoObservable } from 'mobx';

export class ModalService {
  isOpen: boolean;

  constructor(initIsOpen = false) {
    makeAutoObservable(this);
    this.isOpen = initIsOpen;
  }

  setIsOpen = (isOpen: boolean) => {
    this.isOpen = isOpen;
  };

  toggle = () => {
    this.isOpen = !this.isOpen;
  };

  open = () => {
    this.isOpen = true;
  };

  close = () => {
    this.isOpen = false;
  };

  get props() {
    return {
      open: this.isOpen,
      onClose: this.close,
    };
  }
}
