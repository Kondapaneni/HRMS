# React Query Migration Plan

The application currently uses manual `useEffect` and `useState` combinations alongside `axios` to fetch data. This causes loading spinners every time a page is visited, as the data is not cached locally. 

By migrating to `@tanstack/react-query` (which is already installed and configured in your `App.jsx`), we will automatically inherit the powerful caching features: **Refetch on Window Focus**, **Refetch on Mount**, and **Refetch on Reconnect**.

## User Review Required

> [!WARNING]
> This is a large refactor. It will touch almost every single page component in the frontend to replace `useState(loading, data)` with `useQuery()`. Please review the scope of changes below before I proceed.

## Proposed Changes

We will refactor the following 20 components to use `useQuery`:

### Employee Dashboard & Portal
#### [MODIFY] [EmployeeProfile.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/EmployeeProfile.jsx)
#### [MODIFY] [EmployeePayroll.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/EmployeePayroll.jsx)
#### [MODIFY] [EmployeeLeaves.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/EmployeeLeaves.jsx)
#### [MODIFY] [EmployeeAttendance.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/EmployeeAttendance.jsx)
#### [MODIFY] [EditProfilePage.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/EditProfilePage.jsx)

### Admin Dashboard & Core
#### [MODIFY] [AdminDashboard.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminDashboard.jsx)
#### [MODIFY] [AdminEmployees.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminEmployees.jsx)
#### [MODIFY] [AdminEmployeeView.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminEmployeeView.jsx)
#### [MODIFY] [AdminEmployeeEdit.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminEmployeeEdit.jsx)
#### [MODIFY] [AdminEmployeeSettings.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminEmployeeSettings.jsx)

### Admin Features
#### [MODIFY] [AdminAttendance.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminAttendance.jsx)
#### [MODIFY] [AdminAttendanceLocation.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminAttendanceLocation.jsx)
#### [MODIFY] [AdminAttendanceRegularize.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminAttendanceRegularize.jsx)
#### [MODIFY] [AdminLeaves.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminLeaves.jsx)
#### [MODIFY] [AdminPayroll.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminPayroll.jsx)

### Admin Settings & Misc
#### [MODIFY] [AdminHolidays.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminHolidays.jsx)
#### [MODIFY] [AdminHolidaysArchive.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminHolidaysArchive.jsx)
#### [MODIFY] [AdminFeatureAccess.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminFeatureAccess.jsx)
#### [MODIFY] [AdminAuditLogs.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminAuditLogs.jsx)
#### [MODIFY] [AdminAssets.jsx](file:///c:/Users/HP/OneDrive/Desktop/Acme%20HRMS/frontend/src/pages/AdminAssets.jsx)

### Refactoring Strategy per Component
1. Remove `const [loading, setLoading] = useState(true)` and `const [data, setData] = useState([])`.
2. Remove `useEffect` blocks that wrap `fetchData()` calls.
3. Introduce `useQuery` hooks:
```javascript
const { data: employees = [], isLoading: loading } = useQuery({
  queryKey: ['admin', 'employees', debouncedSearch],
  queryFn: async () => {
    const res = await api.get(`/admin/employees?search=${debouncedSearch}`);
    return res.data.employees;
  }
});
```
4. For mutations (add, edit, delete), use `useMutation` or call `queryClient.invalidateQueries(['queryKey'])` to ensure the cache updates automatically when data is modified.

## Verification Plan

### Manual Verification
1. I will log into the admin dashboard and navigate between tabs (Employees, Leaves, Attendance). The first load will show a spinner, but returning to a previously visited tab will show the cached data instantly.
2. I will change focus away from the browser window and back. A small invisible network request should trigger to silently update the data.
