import mitt from 'mitt';
import { makeAutoObservable } from 'mobx';

export class ModalService {
  eventBus = mitt<{ "ON_OPEN": void, "ON_CLOSE": void }>()
  isOpen: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  setIsOpen = (isOpen: boolean) => {
    this.isOpen = isOpen;
  };

  toggle = () => {
    this.isOpen? this.close() : this.open();
  };

  open = () => {
    this.isOpen = true;

    this.eventBus.emit("ON_OPEN");
  };

  close = () => {
    this.isOpen = false;

    this.eventBus.emit("ON_CLOSE");
  };

  get props() {
    return {
      open: this.isOpen,
      onClose: this.close,
    };
  }
}
