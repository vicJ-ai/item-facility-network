# Client logo provenance

The Client Base UI uses only exact customer-name aliases in `src/data/client-logos.ts`. Unlisted or unresolved names have a blank logo slot. Production rendering uses the local PNG files in `public/media/client-logos`; it makes no runtime requests to these source sites.

| Brand | Official source | Preparation | PNG dimensions | PNG SHA-256 |
| --- | --- | --- | --- | --- |
| GuruNanda | `https://gurunanda.com/cdn/shop/files/guru_nanda_logo_4b41339f-0c0c-4c5f-92fc-10e3dfc6db56.png?v=1622764780` | Original official asset, normalized PNG from review set | 200x109 | `880eea3b7e1489dc5f9c3388aa6b90d6bc175c50f1ce7dcc44acada2842034ef` |
| Orgain | `https://orgain.com` | Official inline SVG rendered to PNG with its source styling | 650x221 | `868039e4d88cbce5945c0ea35dd0049baf1b0116c0221fa7c485bedf4b3e099f` |
| Lennox | `https://www.lennox.com/application/themes/lennox/assets/global/lennox_logo.svg` | Original official SVG rendered to PNG | 800x267 | `bb55f87d6c3d5f67965da38ccfe1a7f27bcfa4e4827e5bb2ad3a25bd3a7eff73` |
| Vita Coco | `https://vitacoco.com` | Isolated official page-header mark captured at 2x | 176x120 | `4e9516518bbd9e2a451934be841922f9972c687abe352d75cc91e089d151a5b5` |
| Ember | `https://ember.com/cdn/shop/t/372/assets/ember-logo.png?v=131299254575778786231790017124` | Original official asset, normalized PNG from review set | 1000x240 | `f480ce38a085ad31db2cf93851aae5cfaa3a629c0e4839b300b02c136091b594` |
| Simple Modern | `https://www.simplemodern.com/cdn/shop/files/Simple-Modern_Logo_Black_Stacked_WEB_9f0f8953-7ac5-4846-8193-7ae97359d324.png?v=1761598049&width=300` | Original official asset, normalized PNG from review set | 300x112 | `62dd1432daa054832d04a03dd922954f0e1abc2d0609ac1ab432d01c75ae6cfc` |
| Flag & Anthem | `https://www.flagandanthem.com/cdn/shop/files/logo_dark_2915ddbc-f7fc-48f6-af13-aba614e0e259.png?format=webp&v=1648745133&width=380` | Original official asset, normalized PNG from review set | 380x76 | `cf99e66079fb71fda0304fe26993e913ee64407a3b6706f0f64f49d748c88b11` |
| Graza | `https://www.graza.co/cdn/shop/files/graza-logo.png?v=1638847956` | Original official PNG declared by the official page; replaces the incomplete header crop in the review set | 1380x380 | `d3c10e49d711c082a62be4671f5cccb6e2edb3263fba6ebb742990c0bd632c5a` |
| NZXT | `https://nzxt.com/cdn/shop/files/nzxt-logo-white.svg?v=1747244088&width=94` | Original official SVG rendered to PNG | 800x204 | `801de22ee216ee154f7e62bc8f36ca2a86a53fae5fd6446b16adddab268a4eb6` |
| As Ever | `https://asever.com` | Isolated official page-header mark captured at 2x | 240x100 | `9ca856e8f504adbb17b4dc8e339052aa13fb98a6a4b6d04f4c97167e5b982e68` |
| Ready | `https://teamready.com/cdn/shop/files/Screenshot_2025-04-24_at_10.28.01_AM-removebg-preview.png?v=1745515739&width=600` | Original official asset, normalized PNG from review set | 600x151 | `8c63b6ed691b1f1318fb7a2585248fe12a11462fbb899d341222c3ffd90ad169` |
| Mamma Chia | `https://mammachia.com/cdn/shop/files/MammaChia_NewLogo_300x300.png?v=1643670724` | Original official asset, normalized PNG from review set | 300x75 | `39ab8a2ce397d429045495160eca92596a4dc591d81dbb5785e069bcae4e534f` |
| OUAI | `https://theouai.com/cdn/shop/files/icon-logo.svg?crop=center&height=60&v=1748882671&width=200` | Original official SVG rendered to PNG | 800x241 | `d0ce323c39b8dcba1a5a19d93f9a5cb1b0251c4473ec3cc83a9e654998b89e72` |
| King's Hawaiian | `https://kingshawaiian.com` | Isolated official page-header mark captured at 2x | 752x160 | `c478d68ab8a398a45a64bf91003ebd72cacf37b9960d8074dec5172d27cbc028` |
| ROAR | `https://roarorganic.com/cdn/shop/t/48/assets/roar-logo-lite.svg?v=63345369268202418861718742863` | Original official SVG rendered to PNG | 800x308 | `4d51b0d3ca767304e5d61bbc5fa83f003bbc87de1d6c87354f4ff5c5c8753997` |
| Delta | `https://www.delta-americas.com/images/logo.svg` | Original official SVG rendered to PNG | 800x267 | `d82e7927a7c7381fca6311aa36b0c4770f05482a11c813bebb0ca79e49d3ac1a` |
| Dupray | `https://dupray.com/en-us` | Isolated official page-header mark captured at 2x | 224x60 | `7c003667c0f389c97db3fc83c90bb9ed3abc9063f03647a8e4dc916807f8214c` |

The supplied original SVG bytes for Orgain, Lennox, NZXT, OUAI, ROAR, and Delta are retained under `public/media/client-logos/original/`. Euromarket Designs, KARAKA, and Torquay Etrading remain intentionally blank because no verified mark was approved.
