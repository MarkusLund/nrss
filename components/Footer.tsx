import config from "../deno.json" with { type: "json" };

export default function Footer() {
  return (
    <div className={"p-4 mx-auto max-w-screen-md"}>
      <div className="mt-4 border-t-2 pt-4 space-y-2">
        <p className="text-sm text-gray-600">
          Dette er en backup av det opprinnelige{" "}
          <a class="text-blue-600 hover:underline" href="https://nrss.deno.dev/">
            NRSS-prosjektet
          </a>.
        </p>
        <p>
          <a class="text-blue-600 hover:underline" href={config.source}>Kildekode</a>
        </p>
      </div>
    </div>
  );
}
