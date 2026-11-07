import api from '../api/axios';

// Fetch the complete employee set in bounded pages for screens that genuinely
// need the full hierarchy or assignment picker. Never request an oversized page.
export const fetchAllAdminEmployees = async ({ search = '' } = {}) => {
  const limit = 100;
  const query = new URLSearchParams({ page: '1', limit: String(limit) });
  if (search) query.set('search', search);

  const firstResponse = await api.get(`/admin/employees?${query.toString()}`);
  const firstPage = firstResponse.data?.employees || [];
  const total = Number(firstResponse.data?.total ?? firstPage.length);
  const totalPages = Math.ceil(total / limit);
  const employees = [...firstPage];

  // Keep concurrent requests bounded to avoid a burst against the API.
  for (let firstPageNumber = 2; firstPageNumber <= totalPages; firstPageNumber += 5) {
    const pageNumbers = Array.from(
      { length: Math.min(5, totalPages - firstPageNumber + 1) },
      (_, index) => firstPageNumber + index
    );
    const responses = await Promise.all(pageNumbers.map((page) => {
      const pageQuery = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) pageQuery.set('search', search);
      return api.get(`/admin/employees?${pageQuery.toString()}`);
    }));
    responses.forEach((response) => {
      employees.push(...(response.data?.employees || []));
    });
  }

  return employees;
};
