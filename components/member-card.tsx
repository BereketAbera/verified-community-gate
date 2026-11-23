import Link from "next/link";
import { MapPin } from "lucide-react";
import { countryName, LOOKING_FOR_LABELS } from "@/lib/reference";
import type { Account, SignedLink } from "@/lib/types";
import { MediaPlaceholder } from "./media-placeholder";
import { SignedImage } from "./signed-image";

export function MemberCard({ member, photo, photoPrivate }: { member: Account; photo: SignedLink | null; photoPrivate: boolean }) {
  const placeholder = <MediaPlaceholder kind="photo" reason={photoPrivate ? "private" : "none"} className="aspect-[4/3] rounded-none ring-0" hidden />;
  return (
    <Link
      href={`/members/${member.id}`}
      data-testid="member-card"
      data-member-id={member.id}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:shadow-md hover:ring-foreground/20"
    >
      {photo ? (
        // The name follows in the link text, so the photo itself is decorative here.
        <SignedImage link={photo} alt="" className="aspect-[4/3] w-full object-cover object-[50%_20%]" fallback={placeholder} />
      ) : (
        placeholder
      )}
      <div className="flex flex-1 flex-col gap-1 p-3 sm:gap-1.5 sm:p-4">
        <p className="font-heading text-base leading-tight font-semibold group-hover:underline group-hover:underline-offset-4 sm:text-lg">
          {member.displayName}
          {member.age ? <span className="font-sans text-sm font-normal text-muted-foreground">, {member.age}</span> : null}
        </p>
        <p className="flex items-start gap-1 text-xs text-muted-foreground sm:text-sm">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{member.city}, {countryName(member.country)}</span>
        </p>
        <p className="text-xs text-muted-foreground sm:text-sm">{member.languages.join(" · ")}</p>
        {member.lookingFor ? (
          <p className="mt-auto pt-1.5 text-xs font-medium text-primary sm:pt-2">Looking for: {LOOKING_FOR_LABELS[member.lookingFor]}</p>
        ) : null}
      </div>
    </Link>
  );
}
