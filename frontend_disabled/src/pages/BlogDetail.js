import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import firebaseDataService from '../firebase/dataService';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);

  useEffect(() => {
    if (id) {
      loadBlog();
      loadRelatedBlogs();
    }
  }, [id]);

  const loadBlog = async () => {
    try {
      setLoading(true);
      setError(null);
      const blogData = await firebaseDataService.getBlog(id);
      
      // Check if blog is published
      if (!blogData.published) {
        setError('This blog post is not available.');
        return;
      }
      
      setBlog(blogData);
    } catch (error) {
      console.error('Error loading blog:', error);
      setError('Blog post not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedBlogs = async () => {
    try {
      const allBlogs = await firebaseDataService.getBlogs();
      // Get 3 random blogs excluding the current one
      const filtered = allBlogs.filter(b => b.id !== id);
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      setRelatedBlogs(shuffled.slice(0, 3));
    } catch (error) {
      console.error('Error loading related blogs:', error);
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

  const formatContent = (content) => {
    if (!content) return '';
    
    // Split content into paragraphs and format
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-6 leading-relaxed text-gray-700">
        {paragraph.trim()}
      </p>
    ));
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
                <Link to="/blogs" className="text-gray-600 hover:text-blue-600 transition-colors">
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

  if (error || !blog) {
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
                <Link to="/blogs" className="text-gray-600 hover:text-blue-600 transition-colors">
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
          <div className="space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <Link
              to="/blogs"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              View All Blogs
            </Link>
          </div>
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
              <Link to="/blogs" className="text-gray-600 hover:text-blue-600 transition-colors">
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

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex text-sm">
            <Link to="/home" className="text-gray-500 hover:text-gray-700">
              Home
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <Link to="/blogs" className="text-gray-500 hover:text-gray-700">
              Blog
            </Link>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 truncate">{blog.title}</span>
          </nav>
        </div>
      </div>

      {/* Blog Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Featured Image */}
          {blog.imageUrl && (
            <div className="relative h-96 overflow-hidden">
              <img
                src={blog.imageUrl}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          )}

          <div className="p-8 lg:p-12">
            {/* Meta Info */}
            <div className="flex items-center justify-between mb-8 text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  {formatDate(blog.publishedAt)}
                </span>
                <span>By {blog.author || 'CBTProMax Team'}</span>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back
              </button>
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {blog.title}
            </h1>

            {/* Excerpt */}
            {blog.excerpt && (
              <div className="text-xl text-gray-600 mb-8 leading-relaxed border-l-4 border-blue-500 pl-6 italic">
                {blog.excerpt}
              </div>
            )}

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              {formatContent(blog.content)}
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Related Blogs */}
      {relatedBlogs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Related Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedBlogs.map((relatedBlog) => (
              <article 
                key={relatedBlog.id} 
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <Link to={`/blog/${relatedBlog.id}`}>
                  <div className="relative overflow-hidden">
                    <img
                      src={relatedBlog.imageUrl || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2022&q=80'}
                      alt={relatedBlog.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {relatedBlog.title}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed line-clamp-2">
                      {relatedBlog.excerpt || (relatedBlog.content?.substring(0, 100) + '...')}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-600 font-semibold">
                        {formatDate(relatedBlog.publishedAt)}
                      </span>
                      <span className="text-sm text-gray-500">
                        By {relatedBlog.author || 'CBTProMax Team'}
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

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
                <p>✉️ sales@cbtpromax.com</p>
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

export default BlogDetail;
