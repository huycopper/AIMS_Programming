export class EmailMessage {
  constructor(
    public readonly to: string,
    public readonly subject: string,
    public readonly html: string,
    public readonly text: string,
  ) {}
}
