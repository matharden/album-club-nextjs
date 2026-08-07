import cn from "classnames";
import type { ReactNode } from "react";

import styles from "./Grid.module.scss";

export const Grid = ({
  children,
  className,
  half,
  medium,
  snap,
  small,
}: {
  children?: ReactNode;
  className?: string;
  half?: boolean;
  medium?: boolean;
  snap?: boolean;
  small?: boolean;
}) => (
  <div
    className={cn(
      styles.el,
      {
        [styles.elSnap]: snap,
        [styles.elMedium]: medium,
        [styles.elSmall]: small,
        [styles.elHalf]: half,
      },
      className,
    )}
  >
    {children}
  </div>
);

export const GridItem = ({
  children,
  className,
  id,
  cols,
}: {
  children?: ReactNode;
  className?: string;
  id?: string | number;
  cols?: number;
}) => (
  <div
    className={cn(
      styles.gridItem,
      { [styles[`gridItemCols${cols}`]]: cols },
      className,
    )}
    id={id === undefined ? undefined : String(id)}
  >
    {children}
  </div>
);
