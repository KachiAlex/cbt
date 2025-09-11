import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useLanguage } from '../contexts/LanguageContext';

const BookManagement = () => {
  const { t } = useLanguage();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    category: 'leadership',
    language: 'en',
    coverImage: null,
    pdfFile: null,
    isPublished: false
  });

  const categories = [
    { value: 'leadership', label: 'Leadership & Governance' },
    { value: 'spiritual', label: 'Spiritual Growth' },
    { value: 'community', label: 'Community Development' },
    { value: 'history', label: 'Traditional History' },
    { value: 'wisdom', label: 'Traditional Wisdom' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'sw', label: 'Swahili' },
    { value: 'fr', label: 'French' },
    { value: 'ar', label: 'Arabic' },
    { value: 'zu', label: 'Zulu' },
    { value: 'xh', label: 'Xhosa' },
    { value: 'af', label: 'Afrikaans' },
    { value: 'am', label: 'Amharic' },
    { value: 'yo', label: 'Yoruba' },
    { value: 'ig', label: 'Igbo' },
    { value: 'ha', label: 'Hausa' },
    { value: 'ef', label: 'Efik' },
    { value: 'ib', label: 'Ibibio' },
    { value: 'an', label: 'Annang' },
    { value: 'nu', label: 'Nupe' },
    { value: 'fu', label: 'Fulfulde' },
    { value: 'ka', label: 'Kanuri' },
    { value: 'ti', label: 'Tiv' },
    { value: 'id', label: 'Idoma' },
    { value: 'ik', label: 'Ika' },
    { value: 'ur', label: 'Urhobo' },
    { value: 'is', label: 'Isoko' },
    { value: 'ed', label: 'Edo' },
    { value: 'es', label: 'Esa' },
    { value: 'ek', label: 'Eket' },
    { value: 'or', label: 'Oron' },
    { value: 'ok', label: 'Okobo' },
    { value: 'ik', label: 'Ikwerre' },
    { value: 'og', label: 'Ogoni' },
    { value: 'ij', label: 'Ijaw' },
    { value: 'it', label: 'Itsekiri' },
    { value: 'bi', label: 'Bini' },
    { value: 'es', label: 'Esan' },
    { value: 'af', label: 'Afemai' },
    { value: 'ok', label: 'Okpella' },
    { value: 'un', label: 'Uneme' },
    { value: 'gb', label: 'Gbari' },
    { value: 'gw', label: 'Gwari' },
    { value: 'ka', label: 'Kadara' },
    { value: 'ad', label: 'Adara' },
    { value: 'ba', label: 'Bajju' },
    { value: 'at', label: 'Atyap' },
    { value: 'ag', label: 'Agatu' },
    { value: 'al', label: 'Alago' },
    { value: 'eg', label: 'Eggon' },
    { value: 'go', label: 'Gwandara' },
    { value: 'ho', label: 'Hun-Saare' },
    { value: 'ja', label: 'Jaba' },
    { value: 'ka', label: 'Kaje' },
    { value: 'ka', label: 'Koro' },
    { value: 'ku', label: 'Kuturmi' },
    { value: 'ma', label: 'Mada' },
    { value: 'na', label: 'Nandu' },
    { value: 'ni', label: 'Ninkyob' },
    { value: 'no', label: 'Nok' },
    { value: 'ny', label: 'Nyankpa' },
    { value: 'ri', label: 'Rigwe' },
    { value: 'ru', label: 'Rukuba' },
    { value: 'sa', label: 'Samban' },
    { value: 'ta', label: 'Tari' },
    { value: 'ty', label: 'Tyap' },
    { value: 'wa', label: 'Wapan' },
    { value: 'yo', label: 'Yoruba (Lagos)' },
    { value: 'yo', label: 'Yoruba (Ibadan)' },
    { value: 'yo', label: 'Yoruba (Oyo)' },
    { value: 'yo', label: 'Yoruba (Osun)' },
    { value: 'yo', label: 'Yoruba (Ogun)' },
    { value: 'yo', label: 'Yoruba (Ondo)' },
    { value: 'yo', label: 'Yoruba (Ekiti)' },
    { value: 'yo', label: 'Yoruba (Kwara)' },
    { value: 'yo', label: 'Yoruba (Kogi)' },
    { value: 'yo', label: 'Yoruba (Edo)' }
  ];

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const booksRef = collection(db, 'books');
      const q = query(booksRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBooks(booksData);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const uploadFile = async (file, path) => {
    if (!file) return null;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      let coverImageUrl = formData.coverImageUrl;
      let pdfUrl = formData.pdfUrl;

      // Upload new files if provided
      if (formData.coverImage) {
        coverImageUrl = await uploadFile(formData.coverImage, `books/covers/${Date.now()}_${formData.coverImage.name}`);
      }
      if (formData.pdfFile) {
        pdfUrl = await uploadFile(formData.pdfFile, `books/pdfs/${Date.now()}_${formData.pdfFile.name}`);
      }

      const bookData = {
        title: formData.title,
        author: formData.author,
        description: formData.description,
        category: formData.category,
        language: formData.language,
        coverImageUrl,
        pdfUrl,
        isPublished: formData.isPublished,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (editingBook) {
        await updateDoc(doc(db, 'books', editingBook.id), bookData);
      } else {
        await addDoc(collection(db, 'books'), bookData);
      }

      setFormData({
        title: '',
        author: '',
        description: '',
        category: 'leadership',
        language: 'en',
        coverImage: null,
        pdfFile: null,
        isPublished: false
      });
      setShowForm(false);
      setEditingBook(null);
      fetchBooks();
    } catch (error) {
      console.error('Error saving book:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      description: book.description,
      category: book.category,
      language: book.language,
      coverImage: null,
      pdfFile: null,
      isPublished: book.isPublished,
      coverImageUrl: book.coverImageUrl,
      pdfUrl: book.pdfUrl
    });
    setShowForm(true);
  };

  const handleDelete = async (book) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    
    try {
      setLoading(true);
      
      // Delete files from storage
      if (book.coverImageUrl) {
        const coverRef = ref(storage, book.coverImageUrl);
        await deleteObject(coverRef);
      }
      if (book.pdfUrl) {
        const pdfRef = ref(storage, book.pdfUrl);
        await deleteObject(pdfRef);
      }
      
      // Delete document
      await deleteDoc(doc(db, 'books', book.id));
      fetchBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (book) => {
    try {
      await updateDoc(doc(db, 'books', book.id), {
        isPublished: !book.isPublished,
        updatedAt: new Date()
      });
      fetchBooks();
    } catch (error) {
      console.error('Error updating book status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Book Management</h1>
            <p className="text-gray-600 mt-2">Upload and manage books for Traditional Rulers</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Book
          </button>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {book.coverImageUrl ? (
                  <img 
                    src={book.coverImageUrl} 
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <p>No Cover Image</p>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{book.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    book.isPublished 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {book.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">by {book.author}</p>
                <p className="text-gray-500 text-xs mb-3 line-clamp-2">{book.description}</p>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {languages.find(l => l.value === book.language)?.label}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                      {categories.find(c => c.value === book.category)?.label}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(book)}
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => togglePublish(book)}
                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                      book.isPublished
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {book.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleDelete(book)}
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {books.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
            <p className="text-gray-500 mb-4">Get started by uploading your first book for Traditional Rulers</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Upload First Book
            </button>
          </div>
        )}
      </div>

      {/* Book Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingBook(null);
                    setFormData({
                      title: '',
                      author: '',
                      description: '',
                      category: 'leadership',
                      language: 'en',
                      coverImage: null,
                      pdfFile: null,
                      isPublished: false
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Book Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter book title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Author *
                    </label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter author name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter book description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language *
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {languages.map(lang => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image
                    </label>
                    <input
                      type="file"
                      name="coverImage"
                      onChange={handleInputChange}
                      accept="image/*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {formData.coverImageUrl && !formData.coverImage && (
                      <p className="text-sm text-gray-500 mt-1">Current: {formData.coverImageUrl}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PDF File *
                    </label>
                    <input
                      type="file"
                      name="pdfFile"
                      onChange={handleInputChange}
                      accept=".pdf"
                      required={!editingBook}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {formData.pdfUrl && !formData.pdfFile && (
                      <p className="text-sm text-gray-500 mt-1">Current: {formData.pdfUrl}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Publish immediately
                  </label>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingBook(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingBook ? 'Update Book' : 'Add Book'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookManagement;
