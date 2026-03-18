import React, { useState } from 'react';
import { changePassword } from '../api/api';
import { useTheme } from '../context/ThemeContext';

export default function PasswordChangeForm() {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (formData.new_password !== formData.confirm_password) {
      setError('Новые пароли не совпадают');
      setLoading(false);
      return;
    }

    try {
      await changePassword(formData);
      setSuccess('Пароль успешно изменен');
      setFormData({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Ошибка при изменении пароля (возможно, неверный текущий пароль)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <h2 className={`text-lg font-medium mb-5 ${isDark ? 'text-zinc-100' : 'text-[#1F2937]'}`}>Смена пароля</h2>
      <div className={`border rounded-2xl p-6 ${isDark ? 'border-[#3F3F46] bg-[#27272A]' : 'border-[#E5E7EB] bg-[#F9FAFB]'}`}>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm border border-emerald-100">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-zharyq-dark'}`}>Текущий пароль</label>
            <input
              required
              type="password"
              value={formData.current_password}
              onChange={e => setFormData({ ...formData, current_password: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-zharyq-teal transition-colors ${
                isDark 
                  ? 'bg-[#18181B] border-[#3F3F46] text-white' 
                  : 'bg-white border-zharyq-border text-zharyq-dark'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-zharyq-dark'}`}>Новый пароль</label>
            <input
              required
              type="password"
              value={formData.new_password}
              onChange={e => setFormData({ ...formData, new_password: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-zharyq-teal transition-colors ${
                isDark 
                  ? 'bg-[#18181B] border-[#3F3F46] text-white' 
                  : 'bg-white border-zharyq-border text-zharyq-dark'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-zharyq-dark'}`}>Подтвердите новый пароль</label>
            <input
              required
              type="password"
              value={formData.confirm_password}
              onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-zharyq-teal transition-colors ${
                isDark 
                  ? 'bg-[#18181B] border-[#3F3F46] text-white' 
                  : 'bg-white border-zharyq-border text-zharyq-dark'
              }`}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-zharyq-teal hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-sm shadow-sm"
            >
              {loading ? 'Сохранение...' : 'Изменить пароль'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
