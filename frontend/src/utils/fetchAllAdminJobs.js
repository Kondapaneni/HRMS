import api from '../api/axios';

// Fetch all job options in bounded pages for the recruitment filter selector.
export const fetchAllAdminJobs = async () => {
  const limit = 100;
  const firstResponse = await api.get(`/admin/jobs?page=1&limit=${limit}`);
  const firstPage = firstResponse.data?.jobs || [];
  const total = Number(firstResponse.data?.total ?? firstPage.length);
  const totalPages = Math.ceil(total / limit);
  const jobs = [...firstPage];

  for (let firstPageNumber = 2; firstPageNumber <= totalPages; firstPageNumber += 5) {
    const pageNumbers = Array.from(
      { length: Math.min(5, totalPages - firstPageNumber + 1) },
      (_, index) => firstPageNumber + index
    );
    const responses = await Promise.all(pageNumbers.map((page) =>
      api.get(`/admin/jobs?page=${page}&limit=${limit}`)
    ));
    responses.forEach((response) => jobs.push(...(response.data?.jobs || [])));
  }

  return jobs;
};
