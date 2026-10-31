import Logo from "./Logo";

/** The logo die hopping and tumbling on the table while the campaign loads; still under reduced motion (index.css). */
export default function LoadingDie() {
  return (
    <div className="relative flex h-24 w-14 items-end justify-center" aria-hidden>
      <span className="die-shadow absolute bottom-0 h-2 w-11 rounded-[50%] bg-black/60" />
      <span className="die-hop mb-1.5 block">
        <span className="die-spin block">
          <Logo className="h-12 w-12" />
        </span>
      </span>
    </div>
  );
}
