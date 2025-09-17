import React, { useState, useEffect } from 'react';
import firebaseDataService from '../firebase/dataService';

const BlogManagement = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBlog, setShowCreateBlog] = useState(false);
  const [showEditBlog, setShowEditBlog] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [blogForm, setBlogForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    author: '',
    tags: '',
    published: false
  });

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const allBlogs = await firebaseDataService.getAllBlogs();
      setBlogs(allBlogs);
    } catch (err) {
      setError('Error loading blogs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBlogForm({
      title: '',
      excerpt: '',
      content: '',
      imageUrl: '',
      author: '',
      tags: '',
      published: false
    });
  };

  const handleCreateBlog = () => {
    resetForm();
    setSelectedBlog(null);
    setShowCreateBlog(true);
    setShowEditBlog(false);
  };

  const handleEditBlog = (blog) => {
    setBlogForm({
      title: blog.title || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      imageUrl: blog.imageUrl || '',
      author: blog.author || '',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || ''),
      published: blog.published || false
    });
    setSelectedBlog(blog);
    setShowEditBlog(true);
    setShowCreateBlog(false);
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!blogForm.title.trim() || !blogForm.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      const blogData = {
        title: blogForm.title.trim(),
        excerpt: blogForm.excerpt.trim(),
        content: blogForm.content.trim(),
        imageUrl: blogForm.imageUrl.trim(),
        author: blogForm.author.trim() || 'CBTProMax Team',
        tags: blogForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        published: blogForm.published
      };

      if (selectedBlog) {
        await firebaseDataService.updateBlog(selectedBlog.id, blogData);
        setSuccess('Blog updated successfully!');
      } else {
        await firebaseDataService.createBlog(blogData);
        setSuccess('Blog created successfully!');
      }

      setShowCreateBlog(false);
      setShowEditBlog(false);
      loadBlogs();
      resetForm();
    } catch (err) {
      setError('Error saving blog: ' + err.message);
    }
  };

  const handlePublishToggle = async (blog) => {
    try {
      if (blog.published) {
        await firebaseDataService.unpublishBlog(blog.id);
        setSuccess('Blog unpublished successfully!');
      } else {
        await firebaseDataService.publishBlog(blog.id);
        setSuccess('Blog published successfully!');
      }
      loadBlogs();
    } catch (err) {
      setError('Error updating blog status: ' + err.message);
    }
  };

  const handleDeleteBlog = async (blog) => {
    if (window.confirm('Are you sure you want to delete this blog? This action cannot be undone.')) {
      try {
        await firebaseDataService.deleteBlog(blog.id);
        setSuccess('Blog deleted successfully!');
        loadBlogs();
      } catch (err) {
        setError('Error deleting blog: ' + err.message);
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = firebaseDataService.safeToDate(timestamp);
    return date ? date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'N/A';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
          <p className="text-gray-600 mt-2">Manage blog posts for the CBTProMax website</p>
        </div>
        <button
          onClick={handleCreateBlog}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold"
        >
          Create New Blog
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Blog List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All Blogs ({blogs.length})</h2>
        </div>

        {blogs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No blogs yet</h3>
            <p className="text-gray-500 mb-4">Create your first blog post to get started.</p>
            <button
              onClick={handleCreateBlog}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Create Blog
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {blogs.map((blog) => (
              <div key={blog.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{blog.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        blog.published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {blog.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    
                    {blog.excerpt && (
                      <p className="text-gray-600 mb-2 line-clamp-2">{blog.excerpt}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>By {blog.author || 'CBTProMax Team'}</span>
                      <span>•</span>
                      <span>Created: {formatDate(blog.createdAt)}</span>
                      {blog.publishedAt && (
                        <>
                          <span>•</span>
                          <span>Published: {formatDate(blog.publishedAt)}</span>
                        </>
                      )}
                    </div>
                    
                    {blog.tags && blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {blog.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEditBlog(blog)}
                      className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50"
                      title="Edit blog"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => handlePublishToggle(blog)}
                      className={`p-2 rounded-lg ${
                        blog.published 
                          ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' 
                          : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      }`}
                      title={blog.published ? 'Unpublish blog' : 'Publish blog'}
                    >
                      {blog.published ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteBlog(blog)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                      title="Delete blog"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Blog Modal */}
      {(showCreateBlog || showEditBlog) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedBlog ? 'Edit Blog' : 'Create New Blog'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateBlog(false);
                  setShowEditBlog(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveBlog} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={blogForm.title}
                    onChange={(e) => setBlogForm({...blogForm, title: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter blog title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={blogForm.author}
                    onChange={(e) => setBlogForm({...blogForm, author: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Author name (default: CBTProMax Team)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={blogForm.imageUrl}
                    onChange={(e) => setBlogForm({...blogForm, imageUrl: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={blogForm.tags}
                    onChange={(e) => setBlogForm({...blogForm, tags: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CBT, Education, Technology, WAEC"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Excerpt
                  </label>
                  <textarea
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({...blogForm, excerpt: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Brief description of the blog post (optional)"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content *
                  </label>
                  <textarea
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({...blogForm, content: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="12"
                    placeholder="Write your blog content here..."
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="published"
                      checked={blogForm.published}
                      onChange={(e) => setBlogForm({...blogForm, published: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="published" className="ml-2 text-sm text-gray-700">
                      Publish immediately
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateBlog(false);
                    setShowEditBlog(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {selectedBlog ? 'Update Blog' : 'Create Blog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
