import React from 'react';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  const steps = [
    {
      id: 1,
      title: "Sign Up & Setup",
      description: "Create your institution's account and configure your CBT environment with our guided setup wizard.",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      features: ["Institution profile setup", "Admin account creation", "System configuration", "Initial setup wizard"]
    },
    {
      id: 2,
      title: "Create Exams & Questions",
      description: "Build comprehensive exams with our intuitive question builder. Support for multiple question types and multimedia content.",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      features: ["Multiple choice questions", "True/false questions", "Essay questions", "Image & media support"]
    },
    {
      id: 3,
      title: "Manage Students",
      description: "Add students individually or in bulk. Assign exams and track progress with comprehensive student management tools.",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      features: ["Bulk student import", "Individual registration", "Class management", "Student progress tracking"]
    },
    {
      id: 4,
      title: "Conduct Secure Exams",
      description: "Launch exams with built-in security features. Monitor students in real-time and ensure exam integrity.",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      features: ["Real-time monitoring", "Anti-cheating measures", "Automatic submission", "Session management"]
    },
    {
      id: 5,
      title: "Analyze Results",
      description: "Get instant results with detailed analytics. Generate reports and insights to improve educational outcomes.",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      features: ["Instant results", "Performance analytics", "Detailed reports", "Export capabilities"]
    }
  ];

  const features = [
    {
      title: "WAEC Compliant",
      description: "Fully compliant with WAEC Computer-Based Testing standards and requirements.",
      icon: "✓"
    },
    {
      title: "Multi-Tenant Architecture",
      description: "Support multiple institutions on a single platform with complete data isolation.",
      icon: "🏢"
    },
    {
      title: "Real-Time Monitoring",
      description: "Monitor exam sessions in real-time with comprehensive admin dashboards.",
      icon: "📊"
    },
    {
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime guarantee and data protection.",
      icon: "🔒"
    },
    {
      title: "Easy Integration",
      description: "Simple setup and integration with existing institutional systems.",
      icon: "⚡"
    },
    {
      title: "24/7 Support",
      description: "Round-the-clock technical support and assistance for all users.",
      icon: "🛟"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/home" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CBTProMax</h1>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/home" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Home</Link>
                <Link to="/how-it-works" className="text-blue-600 px-3 py-2 rounded-md text-sm font-medium">How It Works</Link>
                <Link to="/trial" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            How CBTProMax Works
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
            Transform your institution's examination process with our comprehensive Computer-Based Testing platform in just 5 simple steps.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                5 Steps to Success
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Our streamlined process makes it easy to implement CBT in your institution
            </p>
          </div>

          <div className="space-y-16">
            {steps.map((step, index) => (
              <div key={step.id} className={`flex flex-col lg:flex-row items-center gap-12 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                <div className="lg:w-1/2">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mr-6">
                      {step.icon}
                    </div>
                    <div>
                      <span className="text-blue-600 font-semibold text-lg">Step {step.id}</span>
                      <h3 className="text-3xl font-bold text-gray-900">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                    {step.description}
                  </p>
                  <ul className="space-y-3">
                    {step.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:w-1/2">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 shadow-xl">
                    <div className="bg-white rounded-xl p-6 shadow-lg">
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl font-bold text-white">{step.id}</span>
                          </div>
                          <p className="text-gray-600 font-semibold">{step.title}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Everything you need to run successful computer-based examinations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to Get Started?
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
            Join educational institutions across West Africa in implementing modern CBT solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/trial"
              className="bg-white text-blue-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-white/25 hover:scale-105 transform"
            >
              Start Free Trial Today
            </Link>
            <Link
              to="/home"
              className="border-2 border-white/80 text-white px-10 py-4 rounded-xl text-lg font-bold hover:bg-white/10 transition-all duration-300 backdrop-blur-sm hover:scale-105 transform"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">CBTProMax</h3>
            </div>
            <div className="flex justify-center space-x-8 mb-8">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-300">info@cbtpromax.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-300">+2347039612627</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-300">90 Allen Avenue, Ikeja</span>
              </div>
            </div>
            <p className="text-gray-400 text-center">
              &copy; 2024 CBTProMax. All rights reserved. Helping institutions transition to modern digital examinations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HowItWorks;
