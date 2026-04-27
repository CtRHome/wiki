This is a **super cool** page! You can use it for a rough reference of how _markdown_ ~converts~ into *HTML*...
<!-- ~~test~~ should work for strikethrough too -->
<!-- __test__ should work for underline too -->

> "update on the Steam version of Cut the Rope: we're still working on it and hope to return it in 2024" 
> - Om Nom @Cut\_The\_Rope · Dec 8, 2023

Hello! Привет! 你好! Okay, no mandarin fonts, sorry...

::infobox
title: Cabbit
image: cabbit.webp
Species: Holy moly...
-: Note that you have to provide something to the left (not a space) or the row will be ignored. `articles/Media` is used by default!
Suggestion: Try slightly compressing your files so that they load faster on user's end! [SVGs](https://jakearchibald.github.io/svgomg/) · [GIFs](https://ezgif.com/optimize) (use gifski where it's beneficial) · [other images](https://squoosh-multiple-export.vercel.app/)
Author: [koty\_vezde](https://www.instagram.com/koty_vezde/)
::

## Stuff you can do
- Use `#` for headings! (`##`, `###` and `####`)
- Use `-` for bullet lists.
- Use external links like: [GitHub](https://github.com/ctrh-org/wiki).
- Use article links like: [[Main_Page]] or [[Special:Test|Meow]].
-# (hey, the second one is custom text, that's not the actual page title!! Probably not gonna get used often, actually)

# one
## two
-# (both have a direct link icon)
### three
#### four
##### five
###### six...
...The h`x` HTML tags end here! How relieving!

```js
alert("The big Nom is watching")
```
``alert("The big Nom is kind of watching")``

---
^- Dashed separator! How cool!

::card
title: Info card
text: The link below allows both articles and external links, though it's optional.
link: Special:Test
::
::card warning
title: Warning card
text: Spooky!
::
::card danger
title: Danger card
text: Spookier!!!
::

::media right
url: rip.mp4
caption: TheAwesome*less*Blue
second line test
::
Text lalalala!

::media left
url: https://github.com/CtRHome/CutTheRope-WindowsDecomp/raw/refs/heads/main/CutTheRope.csproj
caption: I was going to put another cabbit here but i needed to showcase the binary/unrecognized file version
::
Text again lalalala!

Have a source[^example], but not here[^?]

::media left
url: https://github.com/CtRHome/CutTheRope-WindowsDecomp/raw/refs/heads/main/CutTheRope.cjs
caption: You usually won't be able to see this caption
::

| Thing | Meaning | Notes |
|:---|:---|---:|
| `[[Wiki link]]` | link to another article | supports `[[Target|Custom text]]` |
| `[^id]` | citation reference | define `[^id]: desc ｜ https://example.com` |
| `::media` | embed a file | local files default to `articles/Media/` |

:::msg
kind: todo
message: The icon is loaded from `assets/images/msg/[something].png`, so todo will use todo.png and have a "Todo:" title.
:::
:::msg
kind: warning
message: 𝓗𝓲
:::


```
#REDIRECT [[Main_Page]]
```
for article links
```
#REDIRECT https://example.com
```
for url links! (please don't abuse this one)

[^example]: Woof | https://github.com/CtRHome/wiki