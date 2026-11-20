import { useRemoteTask, useRefreshControl } from '../state/remote.js';
import toast from 'react-hot-toast';
import { markBranchOperationsApplicationAsSeen } from '../services/loanServices';

const APPLICATIONS_QUERY_KEY = ['branchOperations', 'applications', 'list'];

export const useBranchOperationsApplicationReadState = () => {
  const refreshControl = useRefreshControl();

  const mutation = useRemoteTask({
    run: markBranchOperationsApplicationAsSeen,
    onSuccess: (_response, application) => {
      refreshControl.update(APPLICATIONS_QUERY_KEY, (data) => {
        if (!data?.applications) return data;

        return {
          ...data,
          applications: data.applications.map((item) => (
            item.id === application.id ? { ...item, is_new: false } : item
          )),
        };
      });
    },
    onError: () => {
      toast.error("Couldn't sync this application's read status. Please try again.");
    },
    onSettled: () => {
      refreshControl.refresh({ scope: APPLICATIONS_QUERY_KEY });
    },
  });

  return (application) => {
    if (application?.is_new && !mutation.isPending) {
      mutation.mutate(application);
    }
  };
};
