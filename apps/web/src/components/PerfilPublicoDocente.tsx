import styles from './PerfilPublicoDocente.module.css';

type Props={nome:string;areas?:string|null;formacao?:string|null;apresentacao?:string|null};
export function PerfilPublicoDocente({nome,areas,formacao,apresentacao}:Props){
 return <article className={styles.card} aria-label="Perfil profissional compartilhável da EducART">
  <div className={styles.brand}><span className={styles.symbol}>E</span> EducART <span>· corpo docente</span></div>
  <div className={styles.rule}/>
  <span className={styles.eyebrow}>Perfil profissional</span>
  <h1 className={styles.name}>{nome}</h1>
  {areas&&<p className={styles.areas}>{areas}</p>}
  {apresentacao&&<p className={styles.bio}>{apresentacao}</p>}
  {formacao&&<div className={styles.detail}><strong>Formação profissional</strong><p>{formacao}</p></div>}
  <footer className={styles.footer}>EducART · Arte, conhecimento e expressão</footer>
 </article>;
}
