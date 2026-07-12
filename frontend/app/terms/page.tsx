import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service · ft_transcendence',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ← Back
        </Link>

        <header className="mt-8 mb-12 border-b border-neutral-800 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Last updated [DATE]</p>
        </header>

        <article
          className="
            space-y-8
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3
            [&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-neutral-400
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-[15px] [&_ul]:text-neutral-400
            [&_li]:leading-6
            [&_a]:text-neutral-200 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-neutral-700 hover:[&_a]:decoration-neutral-400
          "
        >
          <p>
            Welcome to ft_transcendence (&quot;the Service&quot;). By creating an
            account or using the Service, you agree to these Terms of Service
            (&quot;Terms&quot;). This is a student project built for the 42
            School curriculum and is provided for educational and demonstration
            purposes.
          </p>

          <section>
            <h2>1. Eligibility</h2>
            <p>
              You must be at least 16 years old to create an account. By
              registering, you confirm that the information you provide is
              accurate.
            </p>
          </section>

          <section>
            <h2>2. Your Account</h2>
            <ul>
              <li>You are responsible for keeping your login credentials confidential.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You may log in via email/password or Google OAuth.</li>
              <li>
                You may delete your account at any time via your profile
                settings, if available, or by contacting us.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service to harass, abuse, or harm other users.</li>
              <li>
                Attempt to disrupt, exploit, or gain unauthorized access to the
                Service, its infrastructure, or other users&apos; accounts,
                including cheating or exploiting bugs.
              </li>
              <li>
                Upload avatars or content that is illegal, offensive, or
                infringes on others&apos; rights.
              </li>
              <li>
                Use automated tools (bots) to play matches or manipulate
                leaderboards, unless explicitly playing against the provided AI
                opponent feature.
              </li>
            </ul>
            <p>We reserve the right to suspend or delete accounts that violate these Terms.</p>
          </section>

          <section>
            <h2>4. Content You Provide</h2>
            <ul>
              <li>You retain ownership of content you upload, e.g. your avatar.</li>
              <li>
                By uploading an avatar, you grant us a limited license to store
                and display it within the Service.
              </li>
              <li>
                You are responsible for ensuring you have the right to upload
                any content you submit.
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Game Data &amp; Fair Play</h2>
            <p>
              Match history, stats, and tournament results are recorded based on
              actual gameplay through the Service. We may reset, wipe, or modify
              game data during development without notice, as this is an
              actively developed student project.
            </p>
          </section>

          <section>
            <h2>6. Availability</h2>
            <p>
              This Service is a student project and is provided &quot;as
              is&quot;, without warranties of any kind, express or implied. We
              do not guarantee continuous uptime, that the Service will be free
              of bugs or errors, or long-term data preservation beyond the
              project&apos;s active development or grading period.
            </p>
          </section>

          <section>
            <h2>7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, the developers of
              ft_transcendence are not liable for any indirect, incidental, or
              consequential damages arising from your use of the Service. This
              Service is not intended for production or commercial use.
            </p>
          </section>

          <section>
            <h2>8. Third-Party Login</h2>
            <p>
              If you choose to log in via Google OAuth, your use of that login
              method is also subject to Google&apos;s own Terms of Service.
            </p>
          </section>

          <section>
            <h2>9. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any
              time, with or without cause, including for violations of these
              Terms.
            </p>
          </section>

          <section>
            <h2>10. Changes to These Terms</h2>
            <p>
              We may revise these Terms as the project evolves. Continued use of
              the Service after changes constitutes acceptance of the revised
              Terms.
            </p>
          </section>

          <section>
            <h2>11. Governing Context</h2>
            <p>
              This project is developed as part of the 42 School curriculum and
              these Terms are intended for that educational context rather than
              as a commercially enforceable agreement.
            </p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>
              Questions about these Terms:{' '}
              <a href="mailto:[TEAM EMAIL]">[TEAM EMAIL]</a>
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}