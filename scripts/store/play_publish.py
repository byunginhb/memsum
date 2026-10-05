#!/usr/bin/env python3
"""Google Play Developer API 업로드: AAB → 트랙 릴리스 → 언어별 등록정보·이미지 → 검증 → (--commit) 검토 제출.

폴더 규약 (--store-dir, 기본 docs/store/):
  docs/store/listings/<lang>/title.txt short.txt full.txt notes.txt      (lang 예: en-US, ko-KR)
  docs/store/images/icon.png                                              (512x512, 모든 언어 공용)
  docs/store/images/<lang>/feature.png                                    (1024x500)
  docs/store/images/<lang>/phone/*.png                                    (파일명 순서대로 표시)
  docs/store/images/<lang>/tablet-7/*.png, tablet-10/*.png                (선택)
  <lang> 이미지 폴더가 없으면 docs/store/images/default/ 를 쓴다.

예: python play_publish.py --package app.memsum --aab app.aab --release-name 1.0.0 --mapping mapping.txt --commit   (internal 트랙)
    python play_publish.py ... --track production --user-fraction 0.1 --commit   (프로덕션 10% 단계적 배포)
    python play_publish.py --package app.memsum --commit          (등록정보·이미지·출시노트만)
--track 기본값은 internal — 프로덕션은 실수로 나가지 않도록 반드시 명시한다.
--user-fraction(0~1 미만) 지정 시 릴리스 status=inProgress(단계적 배포), 없으면 completed(전체 배포).
--commit 없으면 검증만 하고 편집을 버린다. 키: PLAY_SA_JSON 또는 ~/android-tools/play-service-account.json
"""
import argparse, glob, os, socket, sys

# 큰 AAB·mapping(수십 MB) 업로드가 기본 소켓 타임아웃(60초)에 끊기지 않게 한다.
socket.setdefaulttimeout(600)
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read().strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--package", required=True)
    ap.add_argument("--store-dir", default="docs/store")
    ap.add_argument("--aab")
    ap.add_argument("--mapping")
    ap.add_argument("--release-name")
    # why internal 기본: 기본값이 production이면 --track을 빠뜨린 검증용 실행이 --commit 한 번에 전체 배포된다.
    ap.add_argument("--track", default="internal")
    ap.add_argument("--user-fraction", type=float, help="단계적 배포 비율(0 < x < 1). 지정 시 status=inProgress")
    ap.add_argument("--default-language")
    ap.add_argument("--skip-images", action="store_true")
    # 등록정보·이미지는 트랙과 무관하게 공개 스토어에 바로 반영된다. 테스트 트랙만 올릴 땐 이 옵션으로 건드리지 않는다.
    ap.add_argument("--release-only", action="store_true", help="AAB·출시 노트만 올리고 등록정보·이미지는 그대로 둔다")
    ap.add_argument("--commit", action="store_true")
    a = ap.parse_args()
    if a.user_fraction is not None and not 0 < a.user_fraction < 1:
        ap.error("--user-fraction은 0보다 크고 1보다 작아야 합니다(전체 배포는 옵션을 빼세요).")
    P = a.package
    listings = os.path.join(a.store_dir, "listings")
    images = os.path.join(a.store_dir, "images")
    langs = sorted(d for d in os.listdir(listings) if os.path.isfile(os.path.join(listings, d, "title.txt"))) if os.path.isdir(listings) else []
    notes = [{"language": l, "text": read(os.path.join(listings, l, "notes.txt"))} for l in langs if os.path.isfile(os.path.join(listings, l, "notes.txt"))]

    key = os.environ.get("PLAY_SA_JSON", os.path.expanduser("~/android-tools/play-service-account.json"))
    creds = service_account.Credentials.from_service_account_file(key, scopes=["https://www.googleapis.com/auth/androidpublisher"])
    e = build("androidpublisher", "v3", credentials=creds, cache_discovery=False).edits()
    eid = e.insert(packageName=P, body={}).execute()["id"]
    print("edit", eid)
    try:
        if a.aab:
            req = e.bundles().upload(packageName=P, editId=eid, media_body=MediaFileUpload(a.aab, mimetype="application/octet-stream", resumable=True, chunksize=8 << 20))
            resp = None
            while resp is None:
                st, resp = req.next_chunk()
                if st: print(f"  AAB {int(st.progress() * 100)}%")
            vc = resp["versionCode"]
            print("AAB versionCode", vc)
            if a.mapping:
                e.deobfuscationfiles().upload(packageName=P, editId=eid, apkVersionCode=vc, deobfuscationFileType="proguard",
                                              media_body=MediaFileUpload(a.mapping, mimetype="application/octet-stream", resumable=True, chunksize=8 << 20)).execute()
            rel = {"name": a.release_name or str(vc), "versionCodes": [str(vc)], "status": "completed"}
            if a.user_fraction is not None:
                rel["status"] = "inProgress"
                rel["userFraction"] = a.user_fraction
            if notes: rel["releaseNotes"] = notes
            e.tracks().update(packageName=P, editId=eid, track=a.track, body={"track": a.track, "releases": [rel]}).execute()
            print(f"{a.track} 릴리스 {rel['name']} ({rel['status']}{', ' + str(a.user_fraction) if a.user_fraction is not None else ''})")
        elif notes:
            t = e.tracks().get(packageName=P, editId=eid, track=a.track).execute()
            rels = t.get("releases", [])
            if rels:
                rels[0]["releaseNotes"] = notes
                e.tracks().update(packageName=P, editId=eid, track=a.track, body={"track": a.track, "releases": rels}).execute()
                print(f"{a.track} 출시 노트 {len(notes)}개 언어")

        def put(lang, kind, paths):
            e.images().deleteall(packageName=P, editId=eid, language=lang, imageType=kind).execute()
            for p in paths:
                e.images().upload(packageName=P, editId=eid, language=lang, imageType=kind, media_body=MediaFileUpload(p, mimetype="image/png")).execute()
            print(f"  [{lang}] {kind} {len(paths)}")

        for l in ([] if a.release_only else langs):
            d = os.path.join(listings, l)
            body = {"language": l, "title": read(os.path.join(d, "title.txt")),
                    "shortDescription": read(os.path.join(d, "short.txt")), "fullDescription": read(os.path.join(d, "full.txt"))}
            e.listings().update(packageName=P, editId=eid, language=l, body=body).execute()
            print(f"[{l}] 제목 {len(body['title'])} / 간단 {len(body['shortDescription'])} / 전체 {len(body['fullDescription'])}")
            if a.skip_images: continue
            img = os.path.join(images, l) if os.path.isdir(os.path.join(images, l)) else os.path.join(images, "default")
            icon = os.path.join(images, "icon.png")
            if os.path.isfile(icon): put(l, "icon", [icon])
            if os.path.isfile(os.path.join(img, "feature.png")): put(l, "featureGraphic", [os.path.join(img, "feature.png")])
            for folder, kind in (("phone", "phoneScreenshots"), ("tablet-7", "sevenInchScreenshots"), ("tablet-10", "tenInchScreenshots")):
                shots = sorted(glob.glob(os.path.join(img, folder, "*.png")))
                if shots: put(l, kind, shots)

        if a.default_language:
            det = e.details().get(packageName=P, editId=eid).execute()
            det["defaultLanguage"] = a.default_language
            e.details().update(packageName=P, editId=eid, body=det).execute()

        e.validate(packageName=P, editId=eid).execute()
        print("검증 통과")
        if a.commit:
            e.commit(packageName=P, editId=eid, changesNotSentForReview=False).execute()
            print("커밋 완료 → 검토 제출됨")
        else:
            e.delete(packageName=P, editId=eid).execute()
            print("(--commit 없음) 편집 폐기")
    except Exception:
        try: e.delete(packageName=P, editId=eid).execute()
        except Exception: pass
        raise

if __name__ == "__main__":
    sys.exit(main())
