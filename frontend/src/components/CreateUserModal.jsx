import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createUserByDirector } from '../api/api';

export default function CreateUserModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    class_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserByDirector(formData);
      onSuccess();
      onClose();
      setFormData({ username: '', email: '', password: '', role: 'student', class_name: '' });
    } catch (err) {
      setError(err.message || 'Ошибка при создании пользователя');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-[#27272A] rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-6 text-zharyq-dark dark:text-white">Создать пользователя</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zharyq-dark dark:text-gray-200">Логин</label>
            <input
              required
              type="text"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 border border-zharyq-border rounded-xl bg-zharyq-bg focus:outline-none focus:ring-2 focus:ring-zharyq-teal text-zharyq-dark dark:bg-[#3F3F46] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zharyq-dark dark:text-gray-200">Почта</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-zharyq-border rounded-xl bg-zharyq-bg focus:outline-none focus:ring-2 focus:ring-zharyq-teal text-zharyq-dark dark:bg-[#3F3F46] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zharyq-dark dark:text-gray-200">Пароль</label>
            <input
              required
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-zharyq-border rounded-xl bg-zharyq-bg focus:outline-none focus:ring-2 focus:ring-zharyq-teal text-zharyq-dark dark:bg-[#3F3F46] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zharyq-dark dark:text-gray-200">Роль</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-zharyq-border rounded-xl bg-zharyq-bg focus:outline-none focus:ring-2 focus:ring-zharyq-teal text-zharyq-dark dark:bg-[#3F3F46] dark:text-white"
            >
              <option value="student">Ученик</option>
              <option value="employee">Сотрудник</option>
              <option value="psychologist">Психолог</option>
              <option value="director">Директор</option>
            </select>
          </div>

          {formData.role === 'student' && (
            <div>
              <label className="block text-sm font-medium mb-1 text-zharyq-dark dark:text-gray-200">Класс (необязательно)</label>
              <input
                type="text"
                placeholder="Например: 10А"
                value={formData.class_name}
                onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                className="w-full px-4 py-2 border border-zharyq-border rounded-xl bg-zharyq-bg focus:outline-none focus:ring-2 focus:ring-zharyq-teal text-zharyq-dark dark:bg-[#3F3F46] dark:text-white"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-zharyq-orange hover:bg-zharyq-orange-hover text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
