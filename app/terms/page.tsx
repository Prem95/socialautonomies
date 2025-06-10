import { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Social Autonomies",
  description: "Terms of Service for Social Autonomies - AI-powered social media automation platform.",
  keywords: "terms of service, terms and conditions, social media automation, AI agents",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Terms Content */}
        <div className="prose prose-lg max-w-none space-y-8">
          
          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold mb-4">OVERVIEW</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                This website is operated by Social Autonomies. Throughout the site, the terms "we", "us" and "our" refer to Social Autonomies. Social Autonomies offers this website, including all information, tools and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies and notices stated here.
              </p>
              <p>
                By visiting our site and/or subscribing to our AI automation service, you engage in our "Service" and agree to be bound by the following terms and conditions ("Terms of Service", "Terms"), including those additional terms and conditions and policies referenced herein and/or available by hyperlink. These Terms of Service apply to all users of the site, including without limitation users who are browsers, subscribers, customers, and/or contributors of content.
              </p>
              <p>
                Please read these Terms of Service carefully before accessing or using our website. By accessing or using any part of the site, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services. If these Terms of Service are considered an offer, acceptance is expressly limited to these Terms of Service.
              </p>
              <p>
                Any new features or tools which are added to the current service shall also be subject to the Terms of Service. You can review the most current version of the Terms of Service at any time on this page. We reserve the right to update, change or replace any part of these Terms of Service by posting updates and/or changes to our website. It is your responsibility to check this page periodically for changes. Your continued use of or access to the website following the posting of any changes constitutes acceptance of those changes.
              </p>
            </div>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 1 - SERVICE TERMS</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                By agreeing to these Terms of Service, you represent that you are at least 18 years of age and have the legal capacity to enter into this agreement.
              </p>
              <p>
                You may not use our services for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws, anti-spam laws, or social media platform terms of service).
              </p>
              <p>
                You agree to comply with all applicable terms of service of third-party platforms, including but not limited to X (formerly Twitter), when using our AI agents to interact with such platforms.
              </p>
              <p>
                You must not transmit any worms or viruses or any code of a destructive nature through our service.
              </p>
              <p>
                A breach or violation of any of the Terms will result in an immediate termination of your services.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 2 - GENERAL CONDITIONS</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We reserve the right to refuse service to anyone for any reason at any time.
              </p>
              <p>
                You understand that your content and data may be transferred unencrypted and involve (a) transmissions over various networks; and (b) changes to conform and adapt to technical requirements of connecting networks or devices. Payment card information is always encrypted during transfer over networks.
              </p>
              <p>
                You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service, use of the Service, or access to the Service without express written permission by us.
              </p>
              <p>
                The headings used in this agreement are included for convenience only and will not limit or otherwise affect these Terms.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 3 - ACCURACY, COMPLETENESS AND TIMELINESS OF INFORMATION</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions without consulting primary, more accurate, more complete or more timely sources of information. Any reliance on the material on this site is at your own risk.
              </p>
              <p>
                This site may contain certain historical information. Historical information, necessarily, is not current and is provided for your reference only. We reserve the right to modify the contents of this site at any time, but we have no obligation to update any information on our site. You agree that it is your responsibility to monitor changes to our site.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 4 - MODIFICATIONS TO THE SERVICE AND PRICES</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Prices for our subscription plans are subject to change without notice.
              </p>
              <p>
                We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.
              </p>
              <p>
                We shall not be liable to you or to any third-party for any modification, price change, suspension or discontinuance of the Service.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 5 - AI AUTOMATION SERVICES</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Our AI automation services are available through subscription plans. These services include AI-powered social media agents that can create and post content on your behalf.
              </p>
              <p>
                You are solely responsible for all content generated and posted by your AI agents. We do not monitor, review, or approve content before it is posted by your agents.
              </p>
              <p>
                We reserve the right, but are not obligated, to limit the sales of our services to any person, geographic region or jurisdiction. We may exercise this right on a case-by-case basis.
              </p>
              <p>
                We do not warrant that the quality of any services, information, or other material obtained by you will meet your expectations, or that any errors in the Service will be corrected.
              </p>
              <p>
                You acknowledge that AI-generated content may not always be perfect and may require human oversight and editing.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 6 - ACCURACY OF BILLING AND ACCOUNT INFORMATION</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We reserve the right to refuse any subscription request. We may, in our sole discretion, limit or cancel subscriptions purchased per person or per account.
              </p>
              <p>
                You agree to provide current, complete and accurate billing and account information for all subscriptions. You agree to promptly update your account and other information, including your email address and payment card numbers and expiration dates, so that we can complete your transactions and contact you as needed.
              </p>
              <p>
                Subscription cancellations will take effect at the end of your current billing period. You will continue to have access to the service until the end of your paid period.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 7 - THIRD-PARTY SERVICES</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We may provide you with access to third-party tools and services over which we neither monitor nor have any control nor input.
              </p>
              <p>
                You acknowledge and agree that we provide access to such tools "as is" and "as available" without any warranties, representations or conditions of any kind and without any endorsement. We shall have no liability whatsoever arising from or relating to your use of optional third-party tools.
              </p>
              <p>
                Our service integrates with X (formerly Twitter) and other social media platforms through their APIs. Any interruption or changes to these third-party services may affect our service functionality.
              </p>
              <p>
                We may also, in the future, offer new services and/or features through the website. Such new features and/or services shall also be subject to these Terms of Service.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 8 - THIRD-PARTY LINKS</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Certain content and services available via our Service may include materials from third-parties.
              </p>
              <p>
                Third-party links on this site may direct you to third-party websites that are not affiliated with us. We are not responsible for examining or evaluating the content or accuracy and we do not warrant and will not have any liability or responsibility for any third-party materials or websites, or for any other materials or services of third-parties.
              </p>
              <p>
                We are not liable for any harm or damages related to the use of third-party services, resources, content, or any other transactions made in connection with any third-party websites. Please review carefully the third-party's policies and practices and make sure you understand them before you engage with any third-party services.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 9 - USER CONTENT, FEEDBACK AND SUBMISSIONS</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                If, at our request, you send certain specific submissions or without a request from us you send creative ideas, suggestions, proposals, plans, or other materials, whether online, by email, or otherwise (collectively, 'comments'), you agree that we may, at any time, without restriction, edit, copy, publish, distribute, translate and otherwise use in any medium any comments that you forward to us.
              </p>
              <p>
                We are and shall be under no obligation (1) to maintain any comments in confidence; (2) to pay compensation for any comments; or (3) to respond to any comments.
              </p>
              <p>
                We may, but have no obligation to, monitor, edit or remove content that we determine in our sole discretion to be unlawful, offensive, threatening, libelous, defamatory, pornographic, obscene or otherwise objectionable or violates any party's intellectual property or these Terms of Service.
              </p>
              <p>
                You are solely responsible for all content created, posted, or shared through your AI agents. This includes ensuring compliance with applicable laws and third-party platform terms of service.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 10 - PERSONAL INFORMATION</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Your submission of personal information through our service is governed by our Privacy Policy. To view our Privacy Policy, please visit{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  our Privacy Policy page
                </Link>
                .
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 11 - ERRORS, INACCURACIES AND OMISSIONS</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Occasionally there may be information on our site or in the Service that contains typographical errors, inaccuracies or omissions that may relate to service descriptions, pricing, promotions, offers, and availability. We reserve the right to correct any errors, inaccuracies or omissions, and to change or update information or cancel subscriptions if any information in the Service is inaccurate at any time without prior notice.
              </p>
              <p>
                We undertake no obligation to update, amend or clarify information in the Service except as required by law. No specified update or refresh date applied in the Service should be taken to indicate that all information in the Service has been modified or updated.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 12 - PROHIBITED USES</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                In addition to other prohibitions as set forth in the Terms of Service, you are prohibited from using the site or its content:
              </p>
              <p>
                (a) for any unlawful purpose; (b) to solicit others to perform or participate in any unlawful acts; (c) to violate any international, federal, provincial or state regulations, rules, laws, or local ordinances; (d) to infringe upon or violate our intellectual property rights or the intellectual property rights of others; (e) to harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate based on gender, sexual orientation, religion, ethnicity, race, age, national origin, or disability; (f) to submit false or misleading information;
              </p>
              <p>
                (g) to upload or transmit viruses or any other type of malicious code; (h) to collect or track the personal information of others; (i) to spam, phish, pharm, pretext, spider, crawl, or scrape; (j) for any obscene or immoral purpose; (k) to interfere with or circumvent the security features of the Service; or (l) to create content that violates social media platform terms of service or community guidelines.
              </p>
              <p>
                We reserve the right to terminate your use of the Service for violating any of the prohibited uses.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 13 - DISCLAIMER OF WARRANTIES; LIMITATION OF LIABILITY</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We do not guarantee, represent or warrant that your use of our service will be uninterrupted, timely, secure or error-free.
              </p>
              <p>
                We do not warrant that the results that may be obtained from the use of the service will be accurate or reliable.
              </p>
              <p>
                You agree that from time to time we may remove the service for indefinite periods of time or cancel the service at any time, without notice to you.
              </p>
              <p>
                You expressly agree that your use of, or inability to use, the service is at your sole risk. The service and all services delivered to you through the service are (except as expressly stated by us) provided 'as is' and 'as available' for your use, without any representation, warranties or conditions of any kind, either express or implied.
              </p>
              <p>
                In no case shall Social Autonomies, our directors, officers, employees, affiliates, agents, contractors, suppliers, service providers or licensors be liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, special, or consequential damages of any kind, including, without limitation lost profits, lost revenue, lost savings, loss of data, replacement costs, or any similar damages, whether based in contract, tort (including negligence), strict liability or otherwise, arising from your use of any of the service, or for any other claim related in any way to your use of the service, even if advised of their possibility.
              </p>
              <p>
                Because some states or jurisdictions do not allow the exclusion or the limitation of liability for consequential or incidental damages, in such states or jurisdictions, our liability shall be limited to the maximum extent permitted by law.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 14 - INDEMNIFICATION</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                You agree to indemnify, defend and hold harmless Social Autonomies and our subsidiaries, affiliates, partners, officers, directors, agents, contractors, licensors, service providers, subcontractors, suppliers, and employees, harmless from any claim or demand, including reasonable attorneys' fees, made by any third-party due to or arising out of your breach of these Terms of Service or the documents they incorporate by reference, or your violation of any law or the rights of a third-party, or any content posted or shared through your AI agents.
              </p>
            </div>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 15 - SEVERABILITY</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                In the event that any provision of these Terms of Service is determined to be unlawful, void or unenforceable, such provision shall nonetheless be enforceable to the fullest extent permitted by applicable law, and the unenforceable portion shall be deemed to be severed from these Terms of Service, such determination shall not affect the validity and enforceability of any other remaining provisions.
              </p>
            </div>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 16 - TERMINATION</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                The obligations and liabilities of the parties incurred prior to the termination date shall survive the termination of this agreement for all purposes.
              </p>
              <p>
                These Terms of Service are effective unless and until terminated by either you or us. You may terminate these Terms of Service at any time by canceling your subscription and ceasing to use our services.
              </p>
              <p>
                If in our sole judgment you fail, or we suspect that you have failed, to comply with any term or provision of these Terms of Service, we also may terminate this agreement at any time without notice and you will remain liable for all amounts due up to and including the date of termination; and/or accordingly may deny you access to our Services (or any part thereof).
              </p>
            </div>
          </section>

          {/* Section 17 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 17 - ENTIRE AGREEMENT</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                The failure of us to exercise or enforce any right or provision of these Terms of Service shall not constitute a waiver of such right or provision.
              </p>
              <p>
                These Terms of Service and any policies or operating rules posted by us on this site or in respect to the Service constitutes the entire agreement and understanding between you and us and govern your use of the Service, superseding any prior or contemporaneous agreements, communications and proposals, whether oral or written, between you and us (including, but not limited to, any prior versions of the Terms of Service).
              </p>
              <p>
                Any ambiguities in the interpretation of these Terms of Service shall not be construed against the drafting party.
              </p>
            </div>
          </section>

          {/* Section 18 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 18 - GOVERNING LAW</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of the United States.
              </p>
            </div>
          </section>

          {/* Section 19 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 19 - CHANGES TO TERMS OF SERVICE</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                You can review the most current version of the Terms of Service at any time at this page.
              </p>
              <p>
                We reserve the right, at our sole discretion, to update, change or replace any part of these Terms of Service by posting updates and changes to our website. It is your responsibility to check our website periodically for changes. Your continued use of or access to our website or the Service following the posting of any changes to these Terms of Service constitutes acceptance of those changes.
              </p>
            </div>
          </section>

          {/* Section 20 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">SECTION 20 - CONTACT INFORMATION</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Questions about the Terms of Service should be sent to us at{" "}
                <a href="mailto:premstroke95@gmail.com" className="text-primary hover:underline">
                  premstroke95@gmail.com
                </a>
                .
              </p>
              <p>Our contact information is posted below:</p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p><strong>Trading Name:</strong> Social Autonomies</p>
                <p><strong>Email Address:</strong> premstroke95@gmail.com</p>
                <p><strong>Business Address:</strong> United States</p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t">
          <p className="text-muted-foreground">
            These Terms of Service are effective as of {new Date().toLocaleDateString()} and apply to all users of Social Autonomies.
          </p>
        </div>
      </div>
    </div>
  );
} 