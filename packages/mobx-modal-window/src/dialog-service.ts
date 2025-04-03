import { IReactionDisposer, makeAutoObservable, when } from 'mobx';

import { ModalService } from './modal-service';

export type DialogCloseReasonType = 'ok' | 'cancel';

export class DialogService {
  modalService = new ModalService();

  disposer?: IReactionDisposer;
  reason?: DialogCloseReasonType;
  onOk?: () => void;

  private closeAfterOk = true;

  constructor() {
    makeAutoObservable(this);
  }

  get isOpen() {
    return this.modalService.isOpen;
  }

  set isOpen(isOpen: boolean) {
    this.modalService.setIsOpen(isOpen);
  }

  toggle = () => {
    this.modalService.toggle();
  };

  /**
   *
   * @returns возвращает промис и резолвит только когда модалка закроется
   */
  open = (settings?: { closeAfterOk?: boolean, onOk?: () => void }) => {
    const { closeAfterOk =  true, onOk }= settings || {};

    this.modalService.setIsOpen(true);
    this.reason = undefined;
    this.closeAfterOk = closeAfterOk;
    this.onOk = onOk;

    return new Promise<DialogCloseReasonType>(resolve => {
      if (this.disposer) {
        this.disposer();
      }

      this.disposer = when(
        () => (!this.isOpen) && Boolean(this.reason),
        () => {
          if(this.reason) {
            resolve(this.reason)
          }
        },
      );
    });
  };

  close = () => {
    this.modalService.setIsOpen(false);
  };

  onCloseHandler = (e: unknown, reason: DialogCloseReasonType) => {
    this.reason = reason;
  }

  confirm = () => {
    this.reason = 'ok';

    if(this.closeAfterOk) {
      this.modalService.setIsOpen(false);
    }

    this.onOk?.();
  }

  cancel = () => {
    this.reason = 'cancel';
    this.modalService.setIsOpen(false);
  }

  get props() {
    return {
      open: this.isOpen,
      onClose: this.onCloseHandler,
      confirm: this.confirm,
      cancel: this.cancel
    };
  }
}
