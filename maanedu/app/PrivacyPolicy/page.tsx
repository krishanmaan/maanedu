'use client';

import { useState } from 'react';

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'data-collection', title: 'Data Collection' },
    { id: 'data-usage', title: 'Data Usage' },
    { id: 'data-sharing', title: 'Data Sharing' },
    { id: 'data-security', title: 'Data Security' },
    { id: 'user-rights', title: 'User Rights' },
    { id: 'children-privacy', title: 'Children\'s Privacy' },
    
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-8">
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-8">
            {activeSection === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-lg text-gray-700 mb-6">
                    MaanEdu (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Key Points</h3>
                    <ul className="space-y-2 text-blue-800">
                      <li>• We collect minimal personal information necessary for app functionality</li>
                      <li>• Your data is encrypted and stored securely</li>
                      <li>• We do not sell your personal information to third parties</li>
                      <li>• You have control over your data and can request deletion</li>
                      <li>• We comply with applicable privacy laws and regulations</li>
                    </ul>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Information We Collect</h3>
                  <p className="text-gray-700 mb-4">
                    We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'data-collection' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Collection</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Account Information:</strong> Email address, name, and profile picture
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Learning Progress:</strong> Course enrollment, class completion, and progress tracking
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Device Information:</strong> Device type, operating system, and app version
                      </div>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Automatically Collected Information</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Usage Data:</strong> How you interact with the app, features used, and time spent
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Technical Data:</strong> IP address, device identifiers, and crash reports
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Video Analytics:</strong> Video viewing progress and completion rates
                      </div>
                    </li>
                  </ul>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-yellow-900 mb-2">Note</h4>
                    <p className="text-yellow-800">
                      We only collect information that is necessary for providing our educational services and improving user experience.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'data-usage' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Use Your Data</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Primary Uses</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <div>
                        <strong>Service Delivery:</strong> Provide access to courses, track progress, and deliver educational content
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <div>
                        <strong>Account Management:</strong> Create and maintain your user account, authenticate your identity
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <div>
                        <strong>Communication:</strong> Send important updates, notifications, and respond to your inquiries
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <div>
                        <strong>Personalization:</strong> Customize your learning experience and recommend relevant content
                      </div>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Analytics and Improvement</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <div>
                        <strong>App Performance:</strong> Monitor app stability, identify bugs, and improve functionality
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <div>
                        <strong>Content Optimization:</strong> Analyze learning patterns to improve course content and delivery
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <div>
                        <strong>Feature Development:</strong> Understand user needs to develop new features and services
                      </div>
                    </li>
                  </ul>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-green-900 mb-2">Legal Basis</h4>
                    <p className="text-green-800">
                      We process your personal data based on your consent, contractual necessity for service provision, and our legitimate interests in improving our services.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'data-sharing' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Sharing and Disclosure</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">We Do NOT Sell Your Data</h3>
                  <p className="text-gray-700 mb-6">
                    We do not sell, trade, or rent your personal information to third parties for marketing purposes.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Limited Sharing</h3>
                  <p className="text-gray-700 mb-4">We may share your information only in the following circumstances:</p>
                  
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <div>
                        <strong>Service Providers:</strong> Trusted third-party services that help us operate our app (e.g., cloud storage, analytics)
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <div>
                        <strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights and safety
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <div>
                        <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <div>
                        <strong>Consent:</strong> When you explicitly consent to sharing your information
                      </div>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Services</h3>
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <p className="text-gray-700 mb-4">Our app integrates with the following services:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li>• <strong>Supabase:</strong> Database and authentication services</li>
                      <li>• <strong>Firebase:</strong> Analytics and crash reporting</li>
                      <li>• <strong>Mux:</strong> Video streaming and analytics</li>
                      <li>• <strong>Google Fonts:</strong> Typography services</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-red-900 mb-2">Important</h4>
                    <p className="text-red-800">
                      All third-party services we use are bound by strict data protection agreements and are prohibited from using your information for their own purposes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'data-security' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Security</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Security Measures</h3>
                  <p className="text-gray-700 mb-6">
                    We implement industry-standard security measures to protect your personal information:
                  </p>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Encryption:</strong> All data is encrypted in transit and at rest using AES-256 encryption
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Secure Authentication:</strong> Multi-factor authentication and secure password policies
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Access Controls:</strong> Strict access controls and regular security audits
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <div>
                        <strong>Regular Updates:</strong> Continuous security updates and vulnerability assessments
                      </div>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Data Retention</h3>
                  <p className="text-gray-700 mb-4">
                    We retain your personal information only as long as necessary to provide our services and comply with legal obligations:
                  </p>
                  
                  <ul className="space-y-2 mb-6 text-gray-700">
                    <li>• Account information: Until you delete your account</li>
                    <li>• Learning progress: Until you delete your account</li>
                    <li>• Analytics data: Up to 2 years in anonymized form</li>
                    <li>• Support communications: Up to 3 years</li>
                  </ul>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-blue-900 mb-2">Your Responsibility</h4>
                    <p className="text-blue-800">
                      Please keep your login credentials secure and notify us immediately if you suspect any unauthorized access to your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'user-rights' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Rights and Choices</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Data Subject Rights</h3>
                  <p className="text-gray-700 mb-6">
                    You have the following rights regarding your personal information:
                  </p>

                  <div className="grid gap-4 mb-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Access</h4>
                      <p className="text-gray-700">Request a copy of your personal data we hold</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Rectification</h4>
                      <p className="text-gray-700">Correct inaccurate or incomplete personal data</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Erasure</h4>
                      <p className="text-gray-700">Request deletion of your personal data</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Portability</h4>
                      <p className="text-gray-700">Receive your data in a structured, machine-readable format</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Objection</h4>
                      <p className="text-gray-700">Object to processing of your personal data</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Withdraw Consent</h4>
                      <p className="text-gray-700">Withdraw consent for data processing at any time</p>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">How to Exercise Your Rights</h3>
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <p className="text-gray-700 mb-4">To exercise any of these rights, you can:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li>• Use the settings in our mobile app</li>
                      <li>• Contact us at privacy@maanedu.com</li>
                      <li>• Submit a request through our support system</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-green-900 mb-2">Response Time</h4>
                    <p className="text-green-800">
                      We will respond to your requests within 30 days and provide the requested information free of charge, unless the request is manifestly unfounded or excessive.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'children-privacy' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Children&apos;s Privacy</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Age Requirements</h3>
                  <p className="text-gray-700 mb-6">
                    MaanEdu is designed for educational use and may be used by students of various ages. We take special care to protect the privacy of children under 13 years of age.
                  </p>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">COPPA Compliance</h3>
                  <p className="text-gray-700 mb-4">
                    In compliance with the Children&apos;s Online Privacy Protection Act (COPPA), we:
                  </p>
                  
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <div>
                        <strong>Parental Consent:</strong> Require verifiable parental consent before collecting personal information from children under 13
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <div>
                        <strong>Limited Collection:</strong> Collect only the minimum information necessary for educational purposes
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <div>
                        <strong>No Third-Party Sharing:</strong> Do not share children&apos;s information with third parties without parental consent
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <div>
                        <strong>Parental Rights:</strong> Provide parents with the right to review, delete, and refuse further collection of their child&apos;s information
                      </div>
                    </li>
                  </ul>

                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Educational Use</h3>
                  <p className="text-gray-700 mb-6">
                    When MaanEdu is used in educational settings, we work with schools and educational institutions to ensure compliance with applicable privacy laws and regulations.
                  </p>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-purple-900 mb-2">Parental Contact</h4>
                    <p className="text-purple-800">
                      If you are a parent and believe your child has provided personal information to us, please contact us immediately at privacy@maanedu.com so we can take appropriate action.
                    </p>
                  </div>
                </div>
              </div>
            )}

            
          </div>
        </div>
      </div>
    </div>
  );
}
