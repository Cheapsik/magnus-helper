import { cn } from "@/lib/utils";

const Logo = ({ className = "h-7 w-7" }: { className?: string }) => (
  <img
    src={`${import.meta.env.BASE_URL}favicon.png`}
    alt=""
    width={28}
    height={28}
    decoding="async"
    className={cn(className, "object-contain shrink-0")}
  />
);

export default Logo;
