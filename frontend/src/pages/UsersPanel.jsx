import { useEffect, useState } from "react";
import { authHttp } from "@/api/http";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editRole, setEditRole] = useState("user");
  const [editVerified, setEditVerified] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authHttp.get("/admin/users");
      setUsers(data.users || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const startEdit = (u) => {
    setEditing(u.id);
    setEditRole(u.role || "user");
    setEditVerified(!!u.is_verified);
  };
  const cancelEdit = () => setEditing(null);

  const saveEdit = async (id) => {
    try {
      await authHttp.put(`/admin/users/${id}`, { role: editRole, is_verified: editVerified });
      await fetchUsers();
      cancelEdit();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const removeUser = async (id) => {
    if (!confirm("Delete user?")) return;
    try {
      await authHttp.delete(`/admin/users/${id}`);
      await fetchUsers();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Users</h2>
      <table className="w-full table-auto mb-4">
        <thead>
          <tr className="text-left">
            <th className="p-2">ID</th>
            <th className="p-2">Email</th>
            <th className="p-2">Role</th>
            <th className="p-2">Verified</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.id}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">
                {editing === u.id ? (
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                ) : u.role}
              </td>
              <td className="p-2">
                {editing === u.id ? (
                  <input type="checkbox" checked={editVerified} onChange={(e) => setEditVerified(e.target.checked)} />
                ) : (u.is_verified ? "Yes" : "No")}
              </td>
              <td className="p-2">
                {editing === u.id ? (
                  <>
                    <button className="mr-2 px-2 py-1 bg-green-500 text-white rounded" onClick={() => saveEdit(u.id)}>Save</button>
                    <button className="px-2 py-1 bg-gray-200 rounded" onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="mr-2 px-2 py-1 bg-blue-500 text-white rounded" onClick={() => startEdit(u)}>Edit</button>
                    <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={() => removeUser(u.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}