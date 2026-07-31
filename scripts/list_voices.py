import asyncio
import edge_tts


async def main() -> None:
    voices = await edge_tts.list_voices()
    for v in voices:
        locale = v.get("Locale", "")
        if locale.startswith("en-US") or locale.startswith("ar-"):
            print(f"{v['ShortName']}\t{v['Gender']}\t{locale}")


if __name__ == "__main__":
    asyncio.run(main())
