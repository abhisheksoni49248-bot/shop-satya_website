'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Category {
  id: number;
  name: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  // पेज खुलते ही डेटा फेच करने के लिए
  useEffect(() => {
    async function loadCategories() {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
        if (error) {
          console.error('Error fetching categories:', error.message);
        } else {
          setCategories(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    }

    loadCategories();
  }, []);

  // अलग से फेच फंक्शन जो बाद में इस्तेमाल होगा
  const fetchCategories = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
      if (error) {
        console.error('Error fetching categories:', error.message);
      } else {
        setCategories(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.from('categories').insert([{ name: newCategory.trim() }]);
      
      if (error) {
        alert('कैटेगरी जोड़ने में त्रुटि: ' + error.message);
      } else {
        setNewCategory('');
        fetchCategories();
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('क्या आप सच में इस कैटेगरी को डिलीट करना चाहते हैं?')) return;
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        alert('डिलीट करने में त्रुटि: ' + error.message);
      } else {
        fetchCategories();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Manage Categories</h1>

      <form onSubmit={handleAddCategory} className="mb-8 flex gap-4">
        <input
          type="text"
          placeholder="नई कैटेगरी का नाम..."
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="border border-slate-800 p-3 rounded-xl w-1/3 text-white bg-slate-900 focus:outline-none focus:border-orange-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          {loading ? 'Adding...' : '+ Add Category'}
        </button>
      </form>

      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 text-white max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Categories List</h2>
        {categories.length === 0 ? (
          <p className="text-slate-500 text-sm">अभी कोई कैटेगरी नहीं है।</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {categories.map((cat) => (
              <li key={cat.id} className="flex justify-between items-center py-3">
                <span className="font-medium text-slate-200">{cat.name}</span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}