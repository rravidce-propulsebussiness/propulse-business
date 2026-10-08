/**
 * Shared upload widget for a package specification PDF or a project brochure.
 * The file is stored through the existing authenticated project-plan upload API.
 */
export default function ProfileBrochureField({title,description,url,displayUrl,busy,onUpload,onRemove}){
  return <section className="profile-brochure-field" aria-label={title}>
    <div className="profile-brochure-head">
      <span className="profile-brochure-mark" aria-hidden="true">▤</span>
      <div><strong>{title}</strong><p>{description}</p></div>
      {url&&<span className="profile-brochure-ready">Uploaded</span>}
    </div>
    <div className="profile-brochure-actions">
      <label className={'profile-brochure-upload'+(busy?' busy':'')}>
        <span>{busy?'Uploading PDF…':url?'Replace PDF brochure':'Upload brochure PDF'}</span>
        <small>PDF only · Maximum 15 MB</small>
        <input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event=>{
          const file=event.target.files?.[0];event.target.value='';
          if(file)onUpload(file);
        }}/>
      </label>
      {url&&<div className="profile-brochure-file">
        <span>PDF document ready</span>
        {displayUrl&&<a href={displayUrl} target="_blank" rel="noopener noreferrer">Preview ↗</a>}
        <button type="button" onClick={onRemove} disabled={busy}>Remove</button>
      </div>}
    </div>
    {url&&<small className="profile-brochure-note">Click Save Changes below to publish this attachment.</small>}
  </section>
}
