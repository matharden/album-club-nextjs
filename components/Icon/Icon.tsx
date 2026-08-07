import Image from "next/image";

import close_white from "./close_white.svg";
import filter from "./filter.svg";
import inventory_2 from "./inventory_2.svg";
import menu from "./menu.svg";
import search from "./search.svg";
import sort from "./sort.svg";

const icons = {
  close_white,
  filter,
  inventory_2,
  menu,
  search,
  sort,
} as const;

export type IconName = keyof typeof icons;

const Icon = ({
  className,
  icon,
  onClick,
}: {
  className?: string;
  icon: IconName;
  onClick?: () => void;
}) => (
  <Image className={className} onClick={onClick} src={icons[icon]} alt="" />
);

export default Icon;
