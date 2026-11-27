"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import heroImage from "@/assets/BG2.jpg";
import { useAuth } from "@/components/auth-provider";
import { Reveal } from "@/components/motion";
import { buttonClasses } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { motionTokens, smooth, springs } from "@/lib/motion-tokens";

const STEPS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "upload",
    title: "Add a transcript",
    body: "Paste the text or upload a .txt, .vtt or .md file up to 1 MB. It is saved before the AI reads it, so nothing is lost if analysis fails.",
  },
  {
    icon: "edit",
    title: "Check the AI’s draft",
    body: "You get a summary, the decisions and the action items. Anything the transcript did not confirm, like a missing owner or a vague date, is flagged for you.",
  },
  {
    icon: "list",
    title: "Track who owes what",
    body: "Every action item from every meeting in one list. Filter by status, owner or overdue, and tick items off as they get done.",
  },
];

// The hero's words enter one after another from the bottom left, after the picture settles.
const ctaContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: motionTokens.stagger.item * 1.5, delayChildren: motionTokens.duration.normal } },
};

export function Landing() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const rise = reduce ? 0 : motionTokens.distance.lg;
  const ctaItem = {
    hidden: { opacity: 0, y: rise },
    visible: { opacity: 1, y: 0, transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth } },
  };

  return (
    <>
      <section aria-labelledby="hero-title" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-chrome text-on-chrome">
        {/* The picture settles from a slight zoom once, on load. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          initial={{ scale: reduce ? 1 : 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: motionTokens.duration.crawl * 1.6, ease: motionTokens.easing.smooth }}
        >
          <Image
            src={heroImage}
            alt=""
            fill
            sizes="100vw"
            placeholder="blur"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[60%_center]"
          />
          {/* A plain linear shade so the words in the bottom left stay readable. */}
          <div className="absolute inset-0 bg-linear-to-tr from-black/80 via-black/35 to-black/10" />
          <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/50 to-transparent" />
        </motion.div>

        <motion.header
          className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-5 sm:px-8"
          initial={{ opacity: 0, y: reduce ? 0 : -motionTokens.distance.sm }}
          animate={{ opacity: 1, y: 0 }}
          transition={smooth}
        >
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-sm text-[22px] leading-7 font-semibold tracking-[-0.03em] focus-ring">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-lilac" />
            ScribeBox
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            {user ? (
              <Link href="/meetings" className={buttonClasses({ variant: "chrome", size: "sm" })}>
                Open your meetings
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: "chrome", size: "sm" })}>
                  Log in
                </Link>
                <Link href="/register" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                  Create an account
                </Link>
              </>
            )}
          </nav>
        </motion.header>

        {/* The call to action, anchored to the bottom left of the picture. */}
        <motion.div
          className="mx-auto mt-auto w-full max-w-[1200px] px-4 pt-24 pb-12 sm:px-8 sm:pb-16"
          variants={ctaContainer}
          initial="hidden"
          animate="visible"
        >
          <div className="max-w-[620px]">
            <motion.p variants={ctaItem} className="mb-4 text-[15px] font-[550] tracking-[0.02em] text-lilac">
              Meeting notes, without the note-taking
            </motion.p>
            <motion.h1
              id="hero-title"
              variants={ctaItem}
              className="text-[40px] leading-[44px] font-semibold tracking-[-0.03em] text-balance sm:text-[56px] sm:leading-[60px]"
            >
              Turn meeting transcripts into decisions and action items.
            </motion.h1>
            <motion.p variants={ctaItem} className="mt-5 max-w-[520px] text-[18px] leading-7 text-on-chrome-muted">
              ScribeBox reads the transcript, writes the summary and tracks who owes what, and it flags anything the
              meeting didn’t make clear.
            </motion.p>
            <motion.div variants={ctaItem} className="mt-8 flex flex-wrap items-center gap-3">
              <motion.span
                className="inline-flex"
                whileHover={reduce ? undefined : { scale: motionTokens.scale.pop }}
                whileTap={reduce ? undefined : { scale: motionTokens.scale.press }}
                transition={springs.snappy}
              >
                <Link href={user ? "/meetings" : "/register"} className={buttonClasses({ variant: "primary", className: "group" })}>
                  {user ? "Go to your meetings" : "Get started free"}
                  <Icon name="arrowRight" size={18} className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                </Link>
              </motion.span>
              {!user && (
                <Link href="/login" className="rounded-sm py-2 text-[15px] font-[550] sm:px-2 text-on-chrome underline-offset-4 hover:underline focus-ring">
                  I already have an account
                </Link>
              )}
            </motion.div>
          </div>
        </motion.div>
      </section>

      <main id="how-it-works" className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-[640px]">
          <h2 className="text-display text-balance">How ScribeBox works</h2>
          <p className="mt-3 text-[17px] leading-7 text-ink-muted">
            Three steps from a raw transcript to a list your team can act on. You stay in control of every word the AI writes.
          </p>
        </Reveal>
        <div role="list" className="mt-12 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} role="listitem" delay={index * motionTokens.stagger.item * 1.5} className="h-full">
              <div className="surface lift flex h-full flex-col gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-full bg-lilac-soft text-lilac-ink">
                  <Icon name={step.icon} size={22} />
                </span>
                <span className="font-mono text-timestamp text-lilac-ink">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="text-heading">{step.title}</h3>
                <p className="text-[15px] leading-6 text-ink-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1200px] px-4 pb-10 text-label font-normal text-ink-muted sm:px-8">
        ScribeBox · meeting transcripts to action items
      </footer>
    </>
  );
}
