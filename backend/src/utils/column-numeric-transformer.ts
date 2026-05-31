export class ColumnNumericTransformer {
  to(data: number | null): number | null {
    return data;
  }

  from(data: string | null): number | null {
    return data !== null ? parseFloat(data) : null;
  }
}
