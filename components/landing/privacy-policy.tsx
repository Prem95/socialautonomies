import { Calendar } from "lucide-react";

export function PrivacyPolicy() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Privacy Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          
          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Account Information</h3>
                <p>When you create an account, we collect:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email address</li>
                  <li>Public profile information you choose to provide</li>
                  <li>Subscription and billing information</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Social Media Integration</h3>
                <p>When you connect your X (Twitter) account, we may access:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Public profile information</li>
                  <li>Tweet content and engagement data</li>
                  <li>Account statistics (followers, following, etc.)</li>
                  <li>Authorization tokens (securely encrypted)</li>
                </ul>
                <p className="text-sm italic mt-2">We only access data necessary for our service functionality.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Usage Data</h3>
                <p>We automatically collect certain information when you use our service:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Performance and error data</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We use your information for the following purposes:</p>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Service Provision</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Operating and maintaining your AI agents</li>
                  <li>Processing and posting content</li>
                  <li>Analyzing engagement and performance</li>
                  <li>Providing customer support</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Service Improvement</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Developing new features</li>
                  <li>Troubleshooting and fixing issues</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Communication</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Sending service updates</li>
                  <li>Responding to inquiries</li>
                  <li>Providing security notifications</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Legal Compliance</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Complying with legal obligations</li>
                  <li>Enforcing our terms of service</li>
                  <li>Protecting rights and safety</li>
                  <li>Preventing fraud and abuse</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Information Sharing */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Information Sharing and Disclosure</h2>
            <div className="space-y-4 text-muted-foreground">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-semibold text-green-800 mb-2">We do not sell your personal information.</p>
                <p className="text-green-700 text-sm">We only share information in the limited circumstances described below.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Service Providers</h3>
                <p className="mb-2">We work with trusted third-party service providers:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Stripe:</strong> Payment processing and subscription management</li>
                  <li><strong>Supabase:</strong> Database and authentication services</li>
                  <li><strong>X (Twitter) API:</strong> Social media platform integration</li>
                  <li><strong>AI Providers:</strong> LLM providers</li>
                </ul>
                <p className="text-sm italic mt-2">All providers are bound by strict data protection agreements.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Legal Requirements</h3>
                <p>We may disclose information when required by law or to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>Comply with legal processes</li>
                  <li>Respond to government requests</li>
                  <li>Protect our rights and property</li>
                  <li>Ensure user safety</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. Data Security */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We implement comprehensive security measures to protect your information:</p>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Technical Safeguards</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>End-to-end encryption</li>
                  <li>Secure HTTPS connections</li>
                  <li>Regular security audits</li>
                  <li>Access controls and monitoring</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Operational Security</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Employee background checks</li>
                  <li>Limited data access policies</li>
                  <li>Incident response procedures</li>
                  <li>Regular security training</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Your Rights and Choices */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Your Rights and Choices</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Data Rights</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Access:</strong> Request copies of your data</li>
                  <li><strong>Correction:</strong> Update inaccurate information</li>
                  <li><strong>Deletion:</strong> Request data removal</li>
                  <li><strong>Portability:</strong> Export your data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Privacy Controls</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Manage cookie preferences</li>
                  <li>Opt out of marketing communications</li>
                  <li>Control social media connections</li>
                  <li>Download your data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We retain your information for as long as necessary to provide our services and comply with legal obligations:</p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Data:</strong> While account is active + 30 days after deletion</li>
                <li><strong>Usage Logs:</strong> 90 days for security and troubleshooting</li>
                <li><strong>Billing Records:</strong> 7 years for tax and legal compliance</li>
              </ul>
            </div>
          </section>

          {/* 7. International Transfers */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. International Data Transfers</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Our servers are primarily located in the United States (us-west). We use AWS for our infrastructure.</p>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">We ensure appropriate safeguards through:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Standard Contractual Clauses (SCCs)</li>
                  <li>Adequacy decisions where applicable</li>
                  <li>Data Processing Agreements with all vendors</li>
                  <li>Regular compliance assessments</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 8. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Children's Privacy</h2>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-800 font-semibold mb-2">Our service is not intended for children under 18.</p>
              <p className="text-red-700 text-sm">We do not knowingly collect personal information from children under 18. If we discover that we have collected information from a child under 18, we will delete it immediately.</p>
            </div>
          </section>

          {/* 9. Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Changes to This Privacy Policy</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We may update this Privacy Policy from time to time. When we make changes:</p>
              
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>We'll post the updated policy on this page</li>
                <li>We'll update the "Last Updated" date</li>
                <li>For significant changes, we'll notify you via email or in-app notification</li>
                <li>Continued use of our service constitutes acceptance of the updated policy</li>
              </ol>
            </div>
          </section>

          {/* 10. Contact Information */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <p><strong>Email:</strong>{" "}
                  <a href="mailto:premstroke95@gmail.com" className="text-primary hover:underline">
                    premstroke95@gmail.com
                  </a>
                </p>
                <p><strong>Trading Name:</strong> Social Autonomies</p>
                <p><strong>Business Address:</strong> United States</p>
              </div>
              
              <p className="text-sm">We aim to respond to privacy inquiries within 48 hours and data requests within 30 days.</p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t">
          <p className="text-muted-foreground">
            This Privacy Policy is effective as of {new Date().toLocaleDateString()} and applies to all users of Social Autonomies.
          </p>
        </div>
      </div>
    </div>
  );
} 