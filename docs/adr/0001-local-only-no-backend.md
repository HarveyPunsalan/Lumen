# 0001 - Local only, no backend

Lumen has no server, no database, and no accounts. A Recording is written to
the user's own disk and never leaves the machine.

Video files are large. Hosting them would turn a four week project into a
four month one, and would leave us paying storage and bandwidth bills every
month whether anyone used the app or not. Tarsi, a budget app built by a
Filipino indie developer, works the same way and treats its $20K first month as
pure profit for exactly this reason.

The Library being local also gives us a security property we could not buy
elsewhere. Lumen makes zero network requests. It cannot exfiltrate a
Recording because there is no code path that sends one anywhere. See
[SECURITY.md](../SECURITY.md).

We accept the cost: no cross device access, no sharing links, and no way to
recover a Recording if the disk fails. Adding any of those later requires a
backend, and that would be a new ADR rather than a change to this one.
