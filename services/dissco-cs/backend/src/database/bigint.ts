/**
 * A BIGSERIAL / BIGINT value as a number. pg returns these columns as strings ("5"), whatever the
 * row type in our code says, because a 64-bit integer may not fit a JS number. Our ids stay far
 * below that limit, and the DTOs promise numbers: the frontend compares them with numbers, e.g.
 * the topic from a ?topic=5 link.
 * @param value the column value as pg returns it
 * Returns: the number.
 */
export function fromBigint(value: string | number): number {
  return Number(value);
}
