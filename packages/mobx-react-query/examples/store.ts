import { makeAutoObservable, runInAction } from 'mobx';
import { AsyncService } from 'mobx-react-query';

export class ViewModel {
  tasks: any;

  constructor(public asyncService: AsyncService) {
    makeAutoObservable(this);
  }

  init = () => {
    this.asyncService.fetchMutation({
      queryKey: ['some-request-key'],
      queryFn: () => fetch('/api/tasks'),
      onSuccess: async (res) => {
        const tasks = await res.json();
        
        runInAction(() => {
          this.tasks = tasks;
        })
      }
    })
  }
}