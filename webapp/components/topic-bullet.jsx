import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function TopicBullet({ href, topic }) {
  return (
    <li>
      <Link href={href} className="moduleTopicLink">
        <span className="moduleTopicBullet" aria-hidden="true" />
        <span className="moduleTopicText">{topic}</span>
        <ChevronRight className="standardMenuArrow" aria-hidden="true" />
      </Link>
    </li>
  );
}
