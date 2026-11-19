import { queryOptions } from '@tanstack/react-query';
import {
  getDashboardData,
  getLeads,
  getBranchLeads,
  getBranchLoanApplications,
  getLoanApplications,
} from '../services/loanServices';
import { getSalesDashboardData, getSalesLeads } from '../services/salesServices';

// Keep established key prefixes intact: loan/sales/branch mutations already
// invalidate them. Parameters mirror the precise API request and scope.
export const originationQueryKeys = {
  loanDashboard: ['leadsDashboard'],
  loanLeads: (search = '') => ['origination', 'leads', 'list', search],
  salesDashboard: ['salesDashboard'],
  salesRecent: ['sales', 'leads', 'recent'],
  branchLeads: (employee = 'all', pipeline = 'all', status = 'All', search = '') =>
    ['branchOperationsLeads', employee, pipeline, status, search],
  branchApplications: ['branchOperations', 'applications', 'list'],
  loanApplications: ['origination', 'applications', 'list'],
};

export const originationQueryOptions = {
  loanDashboard: () => queryOptions({
    queryKey: originationQueryKeys.loanDashboard,
    queryFn: getDashboardData,
    staleTime: 30_000,
  }),
  loanLeads: (search = '') => queryOptions({
    queryKey: originationQueryKeys.loanLeads(search),
    queryFn: getLeads,
    staleTime: 60_000,
  }),
  salesDashboard: () => queryOptions({
    queryKey: originationQueryKeys.salesDashboard,
    queryFn: getSalesDashboardData,
    staleTime: 30_000,
  }),
  salesRecent: () => queryOptions({
    queryKey: originationQueryKeys.salesRecent,
    queryFn: ({ signal }) => getSalesLeads({ signal }),
    staleTime: 60_000,
  }),
  branchLeads: (employee = 'all', pipeline = 'all', status = 'All', search = '') =>
    queryOptions({
      queryKey: originationQueryKeys.branchLeads(employee, pipeline, status, search),
      queryFn: getBranchLeads,
      staleTime: 30_000,
    }),
  loanApplications: () => queryOptions({
    queryKey: originationQueryKeys.loanApplications,
    queryFn: getLoanApplications,
    staleTime: 60_000,
  }),
  branchApplications: () => queryOptions({
    queryKey: originationQueryKeys.branchApplications,
    queryFn: getBranchLoanApplications,
    staleTime: 60_000,
  }),
};
