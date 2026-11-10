import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { markBranchOperationsApplicationAsSeen } from '../services/loanServices';

const APPLICATIONS_QUERY_KEY = ['branchOperations', 'applications', 'list'];

export const useBranchOperationsApplicationReadState = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: markBranchOperationsApplicationAsSeen,
    onSuccess: (_response, application) => {
      queryClient.setQueryData(APPLICATIONS_QUERY_KEY, (data) => {
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
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_QUERY_KEY });
    },
  });

  return (application) => {
    if (application?.is_new && !mutation.isPending) {
      mutation.mutate(application);
    }
  };
};
