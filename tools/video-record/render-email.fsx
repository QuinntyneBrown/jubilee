// Renders an e-mail exactly as the backend sends it, for a journey demo film: the HTML part that
// Jubilee.Application's EmailLayout makes from the text a handler queued (ADR 0038).
//
//   dotnet build backend/src/Jubilee.Application -c Release
//   dotnet fsi tools/video-record/render-email.fsx <subject> <text file> <out.html> [unsubscribe url]
//
// The text file holds the body a handler writes, for example the one StockAlertNotifier queues.
#r "../../backend/src/Jubilee.Application/bin/Release/net10.0/Jubilee.Application.dll"

open System.IO
open Jubilee.Application.Emails

let args = fsi.CommandLineArgs |> Array.skip 1

if args.Length < 3 then
    eprintfn "usage: dotnet fsi render-email.fsx <subject> <text file> <out.html> [unsubscribe url]"
    exit 1

let unsubscribe = if args.Length > 3 then args[3] else null
let message = EmailLayout.Render("member@example.com", args[0], File.ReadAllText args[1], unsubscribe)
File.WriteAllText(args[2], message.HtmlBody)
printfn "%s written (%d characters)" args[2] message.HtmlBody.Length
