import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import firebaseDataService from '../firebase/dataService';

const LandingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [blogs, setBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  
  // Admin access system state
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [konamiCode, setKonamiCode] = useState([]);
  const [secretSequence, setSecretSequence] = useState([]);
  const [showAdminHint, setShowAdminHint] = useState(false);
  
  // Banner slides data - using single fixed background image of African students taking CBT exam
  const backgroundImage = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"; // Students in classroom with computers taking exam
  
  const slides = [
    {
      id: 1,
      title: "Transform Your Institution with Modern CBT Technology",
      subtitle: "Empowering educational institutions to implement cutting-edge Computer-Based Testing solutions",
      cta: "Get Started Today",
      gradient: "from-blue-600 via-indigo-600 to-purple-600"
    },
    {
      id: 2,
      title: "WAEC-Compliant CBT Solutions",
      subtitle: "Helping institutions meet the new Computer-Based Testing standards set by WAEC",
      cta: "Learn More",
      gradient: "from-emerald-600 via-teal-600 to-cyan-600"
    },
    {
      id: 3,
      title: "Seamless Digital Exam Management",
      subtitle: "From question creation to result analysis - complete digital transformation for your institution",
      cta: "Start Free Trial",
      gradient: "from-violet-600 via-purple-600 to-fuchsia-600"
    }
  ];

  // Statistics data
  const stats = [
    { value: "500+", label: "Institutions", icon: "🏫" },
    { value: "50K+", label: "Students", icon: "👥" },
    { value: "99.9%", label: "Uptime", icon: "⚡" },
    { value: "24/7", label: "Support", icon: "🛡️" }
  ];

  // Enhanced features
  const features = [
    {
      title: "WAEC Compliant",
      description: "Fully compliant with WAEC's Computer-Based Testing standards and requirements",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-blue-500 to-indigo-600",
      delay: "0"
    },
    {
      title: "Lightning Fast",
      description: "Optimized for speed with real-time performance monitoring and instant results",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      gradient: "from-green-500 to-emerald-600",
      delay: "100"
    },
    {
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime guarantee and comprehensive data protection",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      gradient: "from-purple-500 to-pink-600",
      delay: "200"
    },
    {
      title: "Real-time Analytics",
      description: "Comprehensive dashboards and insights to track student performance and exam analytics",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: "from-orange-500 to-red-600",
      delay: "300"
    },
    {
      title: "Easy Integration",
      description: "Seamless setup with multi-tenant architecture and customizable branding options",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
        </svg>
      ),
      gradient: "from-cyan-500 to-blue-600",
      delay: "400"
    },
    {
      title: "Mobile Responsive",
      description: "Fully responsive design that works seamlessly across all devices and screen sizes",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      gradient: "from-pink-500 to-rose-600",
      delay: "500"
    }
  ];

  // Testimonials
  const testimonials = [
    {
      name: "Dr. Adebayo Ogunleye",
      role: "Vice Chancellor, University of Lagos",
      content: "CBTProMax has revolutionized how we conduct examinations. The platform is intuitive, reliable, and fully compliant with WAEC standards.",
      avatar: "👨‍🎓"
    },
    {
      name: "Prof. Chioma Nwosu",
      role: "Registrar, Federal Polytechnic",
      content: "The transition to CBT was seamless. Our students love the modern interface, and our staff appreciate the comprehensive analytics.",
      avatar: "👩‍🏫"
    },
    {
      name: "Mr. Ibrahim Musa",
      role: "IT Director, State College",
      content: "Best investment we've made in educational technology. The support team is exceptional, and the platform never disappoints.",
      avatar: "👨‍💼"
    }
  ];

  // Load blogs from Firebase
  const loadBlogs = async () => {
    try {
      setLoadingBlogs(true);
      const publishedBlogs = await firebaseDataService.getBlogs();
      setBlogs(publishedBlogs.slice(0, 3)); // Get only the first 3 blogs
    } catch (error) {
      console.error('Error loading blogs:', error);
      // Fallback to default blogs if Firebase fails
      setBlogs([
        {
          id: '1',
          title: 'WAEC Announces Full CBT Transition',
          excerpt: 'The West African Examinations Council has announced the complete transition to Computer-Based Testing for all major examinations by 2025, creating opportunities for institutions to modernize.',
          imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2022&q=80',
          publishedAt: new Date('2024-12-15'),
          author: 'CBTProMax Team'
        },
        {
          id: '2',
          title: 'Benefits of CBT for Students',
          excerpt: 'Discover how Computer-Based Testing is revolutionizing education and improving student outcomes across West African institutions.',
          imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
          publishedAt: new Date('2024-12-10'),
          author: 'CBTProMax Team'
        },
        {
          id: '3',
          title: 'New Platform Features Released',
          excerpt: 'Our latest platform update includes enhanced security features, improved user interface, and better analytics for institutions.',
          imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80',
          publishedAt: new Date('2024-12-05'),
          author: 'CBTProMax Team'
        }
      ]);
    } finally {
      setLoadingBlogs(false);
    }
  };

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Admin access functions
  const handleAdminAccess = () => {
    console.log('🔐 Admin access granted!');
    navigate('/admin-login');
  };

  const handleLogoClick = (e) => {
    if (e.type === 'contextmenu') {
      e.preventDefault();
      setShowAdminHint(true);
      return;
    }
    
    setLogoClickCount(prev => prev + 1);
    if (logoClickCount >= 2) {
      handleAdminAccess();
      setLogoClickCount(0);
    } else {
      setTimeout(() => setLogoClickCount(0), 2000); // Reset after 2 seconds
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl + Alt + A shortcut
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      handleAdminAccess();
    }

    // Konami code: ↑↑↓↓←→←→BA
    const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    
    setKonamiCode(prev => {
      const newSequence = [...prev, e.code];
      if (newSequence.length > konamiSequence.length) {
        newSequence.shift();
      }
      
      if (newSequence.length === konamiSequence.length && 
          newSequence.every((key, index) => key === konamiSequence[index])) {
        handleAdminAccess();
        return [];
      }
      
      return newSequence;
    });
  };

  const handleSecretClick = (area) => {
    const correctSequence = ['header', 'logo', 'footer'];
    setSecretSequence(prev => {
      const newSequence = [...prev, area];
      if (newSequence.length > correctSequence.length) {
        newSequence.shift();
      }
      
      if (newSequence.length === correctSequence.length && 
          newSequence.every((click, index) => click === correctSequence[index])) {
        handleAdminAccess();
        return [];
      }
      
      return newSequence;
    });
  };

  // Scroll handler for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load blogs on component mount
  useEffect(() => {
    loadBlogs();
  }, []);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const handleCTAClick = (cta) => {
    switch(cta) {
      case "Get Started Today":
        navigate('/trial');
        break;
      case "Learn More":
        navigate('/how-it-works');
        break;
      case "Start Free Trial":
        navigate('/trial');
        break;
      default:
        navigate('/trial');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">
      {/* Admin Access Hint */}
      {showAdminHint && (
        <div className="fixed top-4 right-4 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-lg shadow-lg z-50 text-sm border border-gray-700">
          <div className="flex items-center space-x-3">
            <span>🔐</span>
            <div>
              <div className="font-semibold">Admin Access:</div>
              <div className="text-xs text-gray-400 mt-1">Ctrl+Alt+A | Logo 3x | ↑↑↓↓←→←→BA</div>
            </div>
            <button 
              onClick={() => setShowAdminHint(false)}
              className="ml-2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-gray-900/95 backdrop-blur-md shadow-lg border-b border-gray-800' 
            : 'bg-gray-900/80 backdrop-blur-sm border-b border-gray-800/50'
        }`}
        onClick={() => handleSecretClick('header')}
        title="Part of secret sequence"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={handleLogoClick}
                onContextMenu={handleLogoClick}
                title="Triple-click for admin access (Right-click for hints)"
              >
                <img 
                  src="/logo-cbtpromax.png" 
                  alt="CBTProMax Logo" 
                  className="h-10 w-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden items-center space-x-2" id="fallback-logo">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-white">CBTProMax</h1>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Features</a>
              <a href="#testimonials" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Testimonials</a>
              <a href="#blog" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Blog</a>
              <Link 
                to="/admin-login" 
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner with Slides */}
      <section className="relative h-[60vh] overflow-hidden mt-16">
        {/* Fixed background image for all slides - African students taking CBT exam */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ 
            backgroundImage: `url(${backgroundImage})`
          }}
        />
        <div className="absolute inset-0 bg-black/70" />
        
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Gradient overlay for each slide */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-40`} />
            
            <div className="relative h-full flex items-center justify-center">
              <div className="text-center text-white px-6 max-w-5xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-3xl mx-auto leading-relaxed">
                  {slide.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => handleCTAClick(slide.cta)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg text-base font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {slide.cta}
                  </button>
                  <Link
                    to="/how-it-works"
                    className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-lg text-base font-semibold hover:bg-white/20 transition-colors"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Navigation */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 h-2 bg-white rounded-full' 
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60 rounded-full'
              }`}
            />
          ))}
        </div>

        {/* Arrow Navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white transition-colors bg-black/20 rounded-full p-3 hover:bg-black/40 z-20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/80 hover:text-white transition-colors bg-black/20 rounded-full p-3 hover:bg-black/40 z-20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-gray-900 -mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="text-center"
              >
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="text-4xl mb-3">
                    {stat.icon}
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm font-medium">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to transform your institution's examination process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className={`bg-gradient-to-br ${feature.gradient} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Trusted by Leading Institutions
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Join hundreds of institutions already transforming their examination process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold text-white">{testimonial.name}</h4>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <div className="text-blue-400 mb-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.433.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.995 3.638-3.995 5.849h3.983v10h-9.983z"/>
                  </svg>
                </div>
                <p className="text-gray-300 leading-relaxed italic">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Stay Informed
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Latest updates on CBT developments and digital transformation in education
            </p>
          </div>

          {loadingBlogs ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link key={blog.id} to={`/blog/${blog.id}`} className="group">
                  <article className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors h-full flex flex-col">
                    <div className="relative overflow-hidden h-48">
                      <img
                        src={blog.imageUrl || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2022&q=80'}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                        {blog.title}
                      </h3>
                      <p className="text-gray-400 mb-4 leading-relaxed flex-1 line-clamp-3">
                        {blog.excerpt || blog.content?.substring(0, 150) + '...'}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                        <span className="text-sm text-blue-400 font-medium">
                          {blog.publishedAt ? 
                            firebaseDataService.safeToDate(blog.publishedAt)?.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            }) || 'Recently'
                            : 'Recently'
                          }
                        </span>
                        <span className="text-sm text-gray-500">
                          {blog.author || 'CBTProMax Team'}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
          
          {/* View All Blogs Button */}
          <div className="text-center mt-12">
            <Link
              to="/blogs"
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Blog Posts
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Institution?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of educational institutions across West Africa in implementing modern Computer-Based Testing solutions that meet WAEC standards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/trial"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Free Trial Today
            </Link>
            <Link
              to="/how-it-works"
              className="bg-white/10 text-white border border-white/30 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition-colors"
            >
              Learn How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="bg-gradient-to-br from-black via-gray-900 to-slate-900 text-white py-20 cursor-pointer hover:from-gray-900 hover:via-slate-900 hover:to-black transition-all relative overflow-hidden border-t border-gray-800"
        onClick={() => handleSecretClick('footer')}
        title="Final step of secret sequence"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">CBTProMax</h3>
              </div>
              <p className="text-gray-400 leading-relaxed text-lg mb-6">
                Empowering educational institutions across West Africa with modern Computer-Based Testing solutions that meet WAEC standards.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:border-blue-500/50">
                  <svg className="w-5 h-5 text-gray-300 hover:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 hover:border-blue-500/50">
                  <svg className="w-5 h-5 text-gray-300 hover:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Features</h4>
              <ul className="space-y-4 text-gray-400">
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  WAEC Compliant
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Multi-tenant Architecture
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Real-time Analytics
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Secure Testing
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Easy Implementation
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Support</h4>
              <ul className="space-y-4 text-gray-400">
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Documentation
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Training & Onboarding
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  24/7 Support
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Community Forum
                </li>
                <li className="hover:text-blue-400 transition-colors cursor-pointer flex items-center group">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 group-hover:scale-150 transition-transform"></span>
                  Implementation Guide
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Contact</h4>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start space-x-3 hover:text-blue-400 transition-colors">
                  <svg className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>sales@cbtpromax.com</span>
                </li>
                <li className="flex items-start space-x-3 hover:text-blue-400 transition-colors">
                  <svg className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+2347039612627</span>
                </li>
                <li className="flex items-start space-x-3 hover:text-blue-400 transition-colors">
                  <svg className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>90 Allen Avenue, Ikeja, Lagos</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-center md:text-left text-lg">
                &copy; 2024 CBTProMax. All rights reserved. Helping institutions transition to modern digital examinations.
              </p>
              <div className="flex items-center space-x-2 mt-4 md:mt-0">
                <span className="text-gray-600 text-sm">Made with</span>
                <span className="text-red-500 animate-pulse">❤️</span>
                <span className="text-gray-600 text-sm">in Nigeria</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
