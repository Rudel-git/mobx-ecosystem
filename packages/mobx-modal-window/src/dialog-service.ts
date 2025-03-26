import { IReactionDisposer, makeAutoObservable, when } from 'mobx';

import { ModalService } from './modal-service';

export type DialogCloseReasonType = 'ok' | 'cancel';

export class DialogService {
  modalService = new ModalService();

  disposer?: IReactionDisposer;
  reason?: DialogCloseReasonType;

  private closeAfterClicked = true;

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
  open = (settings?: { closeAfterClicked: boolean }) => {
    const { closeAfterClicked =  true }= settings || {};

    this.modalService.setIsOpen(true);
    this.reason = undefined;
    this.closeAfterClicked = closeAfterClicked;

    return new Promise<DialogCloseReasonType>(resolve => {
      if (this.disposer) {
        this.disposer();
      }

      this.disposer = when(
        () => (!this.isOpen || !this.closeAfterClicked) && Boolean(this.reason),
        () => {
          if(this.reason) {
            resolve(this.reason)
          }
        },
      );
    });
  };

  close = (e: unknown, reason: DialogCloseReasonType) => {
    this.reason = reason;
    this.modalService.setIsOpen(false);
  };

  onCloseHandler = (e: unknown, reason: DialogCloseReasonType) => {
    this.reason = reason;

    if(this.closeAfterClicked) {
      this.modalService.setIsOpen(false);
    }
  }

  get props() {
    return {
      open: this.isOpen,
      onClose: this.onCloseHandler,
    };
  }
}
