import { useMemo, useState } from 'react';
import { appStoreSeulement, grouperParCategorie, rechercherServices } from '../../domain/catalogue';
import type { Service } from '../../domain/types';
import { EnTete } from '../components/EnTete';
import { Icone } from '../components/Icone';
import { useI18n } from '../contexts/I18nContext';
import { useCatalogue } from '../hooks/useCatalogue';
import styles from './Catalogue.module.css';

interface Props {
  onRetour: () => void;
  /** « Utiliser » : ouvre la création pré-remplie avec ce service (EF-02) */
  onUtiliser: (service: Service) => void;
}

/**
 * Écran Catalogue (§7.8) : consultation des services préchargés, fraîcheur
 * des données de référence (§5.6), recherche, regroupement par catégorie.
 * « Proposer un service » (EF-09) arrive à l'étape suivante.
 */
export function Catalogue({ onRetour, onUtiliser }: Props) {
  const { t, tn, date } = useI18n();
  const { catalogue } = useCatalogue();
  const [recherche, setRecherche] = useState('');

  const groupes = useMemo(
    () => grouperParCategorie(rechercherServices(catalogue.data, recherche)),
    [catalogue.data, recherche],
  );

  return (
    <div className={styles.ecran}>
      <EnTete
        titre={t('catalogue.titre')}
        sousTitre={tn('catalogue.nombre', catalogue.data.length)}
        retour={{ icone: 'retour', libelle: t('nav.retour'), onClick: onRetour }}
      />
      <p className={styles.fraicheur}>
        {t('catalogue.fraicheur', { n: catalogue.version, d: date(catalogue.publieLe, 'long') })}
      </p>

      <div className={styles.recherche}>
        <Icone nom="recherche" taille={15} />
        <input
          type="search"
          className={styles.rechercheEntree}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t('catalogue.recherche.ph', { n: catalogue.data.length })}
          aria-label={t('catalogue.titre')}
        />
      </div>

      {groupes.length === 0 ? <p className={styles.vide}>{t('catalogue.vide')}</p> : null}

      {groupes.map((g) => (
        <section key={g.categorie} className={styles.groupe}>
          <h2 className={styles.groupeTitre}>
            {t(`categorie.${g.categorie}`)} · {g.services.length}
          </h2>
          <ul className={styles.liste}>
            {g.services.map((s) => (
              <li key={s.id} className={styles.ligne}>
                <span className={styles.logo} style={{ background: s.couleur }}>
                  {s.logo.valeur}
                </span>
                <span className={styles.textes}>
                  <span className={styles.nom}>
                    {s.nom}
                    {appStoreSeulement(s) ? (
                      <span className={styles.badge}>{t('canal.app_store')}</span>
                    ) : null}
                  </span>
                  <span className={styles.detail}>
                    {s.urlGestion ?? s.contactResiliation ?? t(`resiliation.${s.modeResiliation}`)}
                  </span>
                </span>
                <button type="button" className={styles.utiliser} onClick={() => onUtiliser(s)}>
                  {t('catalogue.utiliser')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className={styles.note}>{t('catalogue.note')}</p>
    </div>
  );
}
