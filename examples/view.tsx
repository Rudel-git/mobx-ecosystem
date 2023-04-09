import { ViewModel } from "./store";

const View = () => {
  const [store] = useState(() => new ViewModel(new AsyncService()));

  useEffect(() => {
    store.init();
  }, [])

  if(store.asyncService.isQueryNotReady) {
    return <p>Loading...</p>
  }

  return <p>View</p>
}