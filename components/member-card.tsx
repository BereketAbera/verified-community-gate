import Link from "next/link";
import { MapPin } from "lucide-react";
import { countryName, LOOKING_FOR_LABELS } from "@/lib/reference";
import type { Account } from "@/lib/types";
import type { SignedLink } from "@/lib/types";
import { MediaPlaceholder } from "./media-placeholder";

export function MemberCard({ member, photo, photoPrivate }: { member: Account; photo: SignedLink | null; photoPrivate: boolean }) {
  return (
    <Link
      href={`/members/${member.id}`}
      data-testid="member-card"
      data-member-id={member.id}
      className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:shadow-md hover:ring-foreground/20"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={`Photo of ${member.displayName}`} className="aspect-[4/3] w-full object-cover object-[50%_35%]" />
      ) : (
        <MediaPlaceholder kind="photo" reason={photoPrivate ? "private" : "none"} className="aspect-[4/3] rounded-none ring-0" />
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="font-heading text-lg leading-tight font-semibold group-hover:underline group-hover:underline-offset-4">
          {member.displayName}
          {member.age ? <span className="font-sans text-sm font-normal text-muted-foreground">, {member.age}</span> : null}
        </p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {member.city}, {countryName(member.country)}
        </p>
        <p className="text-sm text-muted-foreground">{member.languages.join(" · ")}</p>
        {member.lookingFor ? (
          <p className="mt-auto pt-2 text-xs font-medium text-primary">Looking for: {LOOKING_FOR_LABELS[member.lookingFor]}</p>
        ) : null}
      </div>
    </Link>
  );
}
