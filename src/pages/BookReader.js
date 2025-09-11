import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useLanguage } from '../contexts/LanguageContext';

const BookReader = () => {
  const { t, language, setLanguage } = useLanguage();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isReading, setIsReading] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'leadership', label: 'Leadership & Governance' },
    { value: 'spiritual', label: 'Spiritual Growth' },
    { value: 'community', label: 'Community Development' },
    { value: 'history', label: 'Traditional History' },
    { value: 'wisdom', label: 'Traditional Wisdom' }
  ];

  const languages = [
    { value: 'all', label: 'All Languages' },
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

  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, selectedCategory, selectedLanguage]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const booksRef = collection(db, 'books');
      const q = query(
        booksRef, 
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc')
      );
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

  const filterBooks = () => {
    let filtered = books;

    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(book => book.language === selectedLanguage);
    }

    setFilteredBooks(filtered);
    setCurrentPage(1);
  };

  const openBook = (book) => {
    setSelectedBook(book);
    setIsReading(true);
  };

  const closeReader = () => {
    setIsReading(false);
    setSelectedBook(null);
  };

  const getLanguageLabel = (langCode) => {
    return languages.find(l => l.value === langCode)?.label || langCode;
  };

  const getCategoryLabel = (catCode) => {
    return categories.find(c => c.value === catCode)?.label || catCode;
  };

  if (isReading && selectedBook) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Reader Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeReader}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Library
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{selectedBook.title}</h1>
                  <p className="text-sm text-gray-600">by {selectedBook.author}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Language:</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {languages.slice(1).map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Reader */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="h-[calc(100vh-200px)]">
              {selectedBook.pdfUrl ? (
                <iframe
                  src={`${selectedBook.pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full border-0"
                  title={selectedBook.title}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p>PDF not available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Digital Library</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover wisdom, leadership insights, and spiritual growth through our curated collection of books for Traditional Rulers
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Books</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, author, or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {languages.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedLanguage('all');
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredBooks.length} of {books.length} books
          </p>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-64 bg-gray-200 flex items-center justify-center">
                  {book.coverImageUrl ? (
                    <img 
                      src={book.coverImageUrl} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm">No Cover</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">{book.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">by {book.author}</p>
                  <p className="text-gray-500 text-xs mb-3 line-clamp-3">{book.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {getLanguageLabel(book.language)}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                      {getCategoryLabel(book.category)}
                    </span>
                  </div>

                  <button
                    onClick={() => openBook(book)}
                    className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Read Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredBooks.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or check back later for new additions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookReader;
