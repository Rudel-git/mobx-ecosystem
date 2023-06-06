import { makeAutoObservable } from 'mobx';

export class ModalService {
  isOpen: boolean = false;

  constructor() {
    makeAutoObservable(this);
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
