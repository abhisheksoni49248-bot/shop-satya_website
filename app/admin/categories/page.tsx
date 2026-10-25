'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category {
  id: number;
  name: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // कैटेगरी फेच करने का फंक्शन
  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
      console.error('Error fetching categories:', error.message);
    } else {
      setCategories(data || []);
      setFetched(true);
    }
  };

  // पेज खुलते ही एक बार डेटा लोड करने के लिए बटन या ऑटो-लोड
  if (!fetched) {
    fetchCategories();
  }

  // नई कैटेगरी जोड़ना
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('categories').insert([{ name: newCategory }]);
    
    if (error) {
      alert('कैटेगरी जोड़ने में त्रुटि: ' + error.message);
    } else {
      setNewCategory('');
      fetchCategories();
    }
    setLoading(false);
  };

  // कैटेगरी डिलीट करना
  const handleDeleteCategory = async (id: number) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert('डिलीट करने में त्रुटि: ' + error.message);
    } else {
      fetchCategories();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manage Categories</h1>

      {/* कैटेगरी जोड़ने का फॉर्म */}
      <form onSubmit={handleAddCategory} className="mb-8 flex gap-4">
        <input
          type="text"
          placeholder="नई कैटेगरी का नाम (जैसे: किराना, ज्वेलरी)..."
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="border p-2 rounded w-1/3 text-black bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Adding...' : '+ Add Category'}
        </button>
      </form>

      {/* कैटेगरी की लिस्ट */}
      <div className="bg-white p-4 rounded shadow border text-black">
        <h2 className="text-lg font-semibold mb-4">Categories List</h2>
        {categories.length === 0 ? (
          <p className="text-gray-500">अभी कोई कैटेगरी नहीं है। ऊपर दिए गए फॉर्म से जोड़ें।</p>
        ) : (
          <ul>
            {categories.map((cat) => (
              <li key={cat.id} className="flex justify-between items-center border-b py-2">
                <span>{cat.name}</span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
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