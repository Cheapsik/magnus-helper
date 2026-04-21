import { AKCJE_GRUPY } from "../constants";

export function ZestawienieAkcji() {
  return (
    <section className="paper-section wfrp-akcje-section">
      <header className="paper-section-header">ZESTAWIENIE AKCJI</header>
      <div className="paper-section-body wfrp-akcje-body">
        <div className="wfrp-akcje-groups">
          {AKCJE_GRUPY.map((g) => (
            <div key={g.naglowek} className="wfrp-akcje-group">
              <table className="wfrp-akcje-table">
                <thead>
                  <tr>
                    <th colSpan={2} className="wfrp-akcje-grupa">
                      {g.naglowek}
                    </th>
                  </tr>
                  <tr>
                    <th scope="col" className="wfrp-akcje-th-left">
                      Akcja
                    </th>
                    <th scope="col" className="wfrp-akcje-th-right">
                      Typ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.wiersze.map(([akcja, typ]) => (
                    <tr key={g.naglowek + akcja}>
                      <td className="wfrp-akcje-td-akcja">{akcja}</td>
                      <td className="wfrp-akcje-td-typ">{typ}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
