import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import firebaseDataService from '../firebase/dataService';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const publishedBlogs = await firebaseDataService.getBlogs();
      setBlogs(publishedBlogs);
    } catch (error) {
      console.error('Error loading blogs:', error);
      setError('Failed to load blog posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = firebaseDataService.safeToDate(timestamp);
    return date ? date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'Recently';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <Link to="/home" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">CBTProMax</span>
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link to="/home" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Home
                </Link>
                <Link to="/blogs" className="text-blue-600 font-semibold">
                  Blog
                </Link>
                <Link to="/how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
                  How It Works
                </Link>
                <Link to="/trial" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Free Trial
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Loading */}
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <Link to="/home" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">CBTProMax</span>
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link to="/home" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Home
                </Link>
                <Link to="/blogs" className="text-blue-600 font-semibold">
                  Blog
                </Link>
                <Link to="/how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
                  How It Works
                </Link>
                <Link to="/trial" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Free Trial
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Error */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={loadBlogs}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link to="/home" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">CBTProMax</span>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link to="/home" className="text-gray-600 hover:text-blue-600 transition-colors">
                Home
              </Link>
              <Link to="/blogs" className="text-blue-600 font-semibold">
                Blog
              </Link>
              <Link to="/how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">
                How It Works
              </Link>
              <Link to="/trial" className="text-gray-600 hover:text-blue-600 transition-colors">
                Free Trial
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            CBTProMax Blog
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Stay updated with the latest insights, tips, and news about computer-based testing, 
            educational technology, and digital assessment solutions.
          </p>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {blogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No blog posts available at the moment.</div>
            <Link
              to="/home"
              className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <article 
                key={blog.id} 
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <Link to={`/blog/${blog.id}`}>
                  <div className="relative overflow-hidden">
                    <img
                      src={blog.imageUrl || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2022&q=80'}
                      alt={blog.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {blog.title}
                    </h2>
                    <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                      {blog.excerpt || (blog.content?.substring(0, 150) + '...')}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-600 font-semibold">
                        {formatDate(blog.publishedAt)}
                      </span>
                      <span className="text-sm text-gray-500">
                        By {blog.author || 'CBTProMax Team'}
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold text-blue-400">CBTProMax</span>
              </div>
              <p className="text-gray-400 mb-4">
                Revolutionizing education through advanced computer-based testing solutions. 
                Empowering institutions with secure, reliable, and user-friendly assessment tools.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/home" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/blogs" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</Link></li>
                <li><Link to="/trial" className="text-gray-400 hover:text-white transition-colors">Free Trial</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
              <div className="space-y-2 text-gray-400">
                <p>📞 +2347039612627</p>
                <p>✉️ info@cbtpromax.com</p>
                <p>📍 90 Allen Avenue, Ikeja</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CBTProMax. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogList;
